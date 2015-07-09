#!/usr/bin/env node

var fs = require('fs'),
    util = require('util'),
    exec = require('child_process').execSync,
    fs = require('fs'),
    program = require('commander'),
    path = require('path'),
    unzip = require('unzip'),
    child;

program
    .version('0.0.1')
    .usage('[options] -i <zipFile>')
    .option('-i, --input <zipFile>',  'Archive ZIP file')
    .option('-f, --format [type]', 'Output format [webm,mp4]', 'webm')
    .parse(process.argv);

if (!program.input) {
  program.help();
}

var zip_file = program.input;
var dirname = path.dirname(zip_file);
var basename = path.basename(zip_file, ".zip");
var temp_dir = path.join(dirname, basename);

// Unzip the archive
var input = fs.createReadStream(zip_file);
var result = input.pipe(unzip.Extract({ path: temp_dir }));

result.on("close", function() {
  var files = fs.readdirSync(temp_dir);

  var json_file;
  files.forEach(function(file) {
    if (path.extname(file) == ".json") {
      json_file = file;
    }
  });

  if (!json_file) {
    console.log("ZIP file does not contain a json file");
  }

  var script = JSON.parse(fs.readFileSync(path.join(temp_dir, json_file)).toString());
  var archiveId = script.id;

  var archive_path = temp_dir;

  var format = program.format;



  var startTime = 10000000000000;
  var endTime = 0;
  // find start end end time for the whole playback
  script.files.forEach(function(e) {
    if (e.startTimeOffset < startTime) {
      startTime = e.startTimeOffset;
    }
    if (e.stopTimeOffset > endTime) {
      endTime = e.stopTimeOffset;
    }
  });
  // make them all 0 based
  script.files.forEach(function(e) {
    e.startTimeOffset -= startTime;
    e.stopTimeOffset -= startTime;
  });
  // sort them by start time
  script.files.sort(function(a, b) {
    return a.startTimeOffset - b.startTimeOffset;
  });
  //console.log("duration=", endTime-startTime);
  //console.log(script.files);

  // calculate the number of streams on each interval
  var timeline = {};
  script.files.forEach(function(e) {
    if (!timeline[e.startTimeOffset]) {
      timeline[e.startTimeOffset] = {};
      timeline[e.startTimeOffset].count = 1;
      timeline[e.startTimeOffset].add = [];
    } else {
      timeline[e.startTimeOffset].count++;
    }
    timeline[e.startTimeOffset].add.push(e);

    if (!timeline[e.stopTimeOffset]) {
      timeline[e.stopTimeOffset] = {};
      timeline[e.stopTimeOffset].count = -1;
      timeline[e.stopTimeOffset].remove = [];
    } else {
      timeline[e.stopTimeOffset].count--;
    }
    timeline[e.stopTimeOffset].remove.push(e);
  });

  var keypoints = timeline;
  var current = 0;
  var prev = -1;

  //console.log(keypoints);
  var active = {};
  var composer = [];

  var addStreams = function(active, streams) {
    if (streams) {
      streams.forEach(function(stream) {
        active[stream.streamId] = {offset: stream.startTimeOffset, 
                                   name: stream.connectionData};
      });
    }
  };

  var removeStreams = function(active, streams) {
    if (streams) {
      streams.forEach(function(stream) {
        delete active[stream.streamId];
      });
    }
  };

  for (var i in keypoints) {

    // on first iteration we don't output anything 
    if (prev == -1) {
      prev = i;
      addStreams(active, keypoints[i].add);
      continue;
    }

    // before adding the new entry we output the diff between previous and current time
    //console.log("t=[" + prev + ", " + i + "]");
    var entry = { start: prev, end: i, files: []};
    for (var j in active) {
      //console.log("streamOffset="+(prev-active[j]), j);
      entry.files.push({streamId: j, offset: (prev-active[j].offset), name: active[j].name});
    }
    composer.push(entry);

    // now update
    current += keypoints[i].count;
    addStreams(active, keypoints[i].add);
    removeStreams(active, keypoints[i].remove);
    prev = i;
  }

  var drawText = function(file, x, y, prefix) {
    if (!file.name || file.name === "") return "";
    return prefix + "drawtext=fontsize=30:fontcolor=white:fontfile=/Library/Fonts/Tahoma.ttf:text='" + file.name + "':"+x+":"+y;
  };

  //console.log(JSON.stringify(composer, null, 4));
  var chunks = [];
  var cmd;
  // now ready to rock
  for (var c in composer) {
    var e = composer[c];
  //  console.log(e);
  //  console.log("ffmpeg grid=", e.files.length);
    var filter = "";
    if (e.files.length == 1) {
      filter = "-filter_complex \"[0]scale=640:-1" + drawText(e.files[0], "x=w/2-text_w/2","y=h-line_h-5", "[b];[b]");
    } else if (e.files.length == 2) {
      filter = "-filter_complex \"[0]scale=320:-1,pad=2*iw:2*ih:0:120[left];[1]scale=320:-1[right];[left][right]overlay=main_w/2:120,scale=640:480";
      filter += drawText(e.files[0], "x=w/4-text_w/2","y=3*h/4-line_h-5", ",");
      filter += drawText(e.files[1], "x=3*w/4-text_w/2","y=3*h/4-line_h-5", ",");
    } else if (e.files.length == 3 || e.files.length == 4) {
      filter = "-filter_complex \"[0]scale=320:-1[a];[1]scale=320:-1[b];[2]scale=320:-1[c];[3]scale=320:-1[d];[a]pad=640:480[x];[x][b]overlay=320[y];[y][c]overlay=0:240[z];[z][d]overlay=320:240";
      filter += drawText(e.files[0], "x=w/4-text_w/2","y=h/2-line_h-5", ",");
      filter += drawText(e.files[1], "x=3*w/4-text_w/2","y=h/2-line_h-5", ",");
      filter += drawText(e.files[2], "x=w/4-text_w/2","y=h-line_h-5", ",");
      if (e.files.length == 4) {
        filter += drawText(e.files[3], "x=3*w/4-text_w/2","y=h-line_h-5", ",");
      }
    }
    if (filter.length !== 0) {
      filter += "\" ";
    }
    cmd = "ffmpeg -y -threads 4 -loglevel quiet ";
    var minDuration = 100000;
    for (var s in e.files) {
      var stream = e.files[s];
      var name = "name";
      var duration = (e.end - stream.offset)/1000;
      minDuration = minDuration < duration ? minDuration : duration;
      cmd += util.format("-ss %d -t %d -i " + archive_path + "/%s.webm ", 
                          stream.offset/1000, 
                          (e.end - stream.offset)/1000, 
                          stream.streamId);
    }
    // add a dummy black input for 3 streams
    if (e.files.length == 3) {
      cmd += "-f lavfi -i color=size=640x480:duration=" + minDuration + " -t " + minDuration + " ";
    }
    var chunk = util.format("temp-%d-%d." + format, e.start, e.end);
    chunks.push(chunk);
    cmd += filter + "-shortest " + chunk;
    console.log(cmd);
    child = exec(cmd, function(err, stdout, stderr) {
      if (err) {
        console.log(err);
        process.exit(1);
      }
    });
  }
  var content = "file '" + chunks.join("\nfile '") + "'";
  fs.writeFileSync(archiveId + "-list.txt", content);

  // concat all chunks
  cmd = "ffmpeg -y -threads 4 -loglevel quiet -f concat -i " + archiveId + "-list.txt -r 24 " + archiveId + "." + format;
  console.log(cmd);
  child = exec(cmd, function(error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    }
  });

  // remove temp files
  fs.unlinkSync(archiveId + "-list.txt");
  chunks.forEach(function(chunk) {
    console.log("Removing", chunk);
    fs.unlinkSync(chunk);
  });
});
