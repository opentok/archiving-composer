var result = fs.createReadStream(zip_file).pipe(unzip.Extract({ path: temp_dir }));

result.on("close", function () {
  var files = fs.readdirSync(temp_dir);

  var json_file;
  files.forEach(function (file) {
    if (path.extname(file) == ".json") {
      json_file = file;
    }
  });

  if (!json_file) {
    console.log("ZIP file does not contain a json file");
  }

  var script = JSON.parse(
    fs.readFileSync(path.join(temp_dir, json_file)).toString()
  );

  var archiveId = script.id;
  var archive_path = temp_dir;
  var format = program.format;

  var startTime = 10000000000000;
  var endTime = 0;

  // find start end end time for the whole playback
  script.files.forEach(function (e) {
    if (e.startTimeOffset < startTime) {
      startTime = e.startTimeOffset;
    }
    if (e.stopTimeOffset > endTime) {
      endTime = e.stopTimeOffset;
    }
  });

  // make them all 0 based
  script.files.forEach(function (e) {
    e.startTimeOffset -= startTime;
    e.stopTimeOffset -= startTime;
  });

  // sort them by start time
  script.files.sort(function (a, b) {
    return a.startTimeOffset - b.startTimeOffset;
  });

  console.log("script=",script);
  console.log("duration=", endTime - startTime);

  var inputs = "";

  // Loop over the files to Create a WAV file for each path that has the same offset at the start.
  script.files.forEach((oneFile) => {
    
    let speaker_name = JSON.parse(oneFile.connectionData).userName.replace(/[^a-z0-9]/gi, '_');

    // generate a single wavefile with a delay at the front of it.
    let inputFile = `${archive_path}/${oneFile.filename}`;
    let outputFile = `${archive_path}/${speaker_name}-${oneFile.filename}.wav`;
    cmd = `ffmpeg -y -loglevel warning -acodec libopus -i ${inputFile} -af "adelay=${oneFile.startTimeOffset}|${oneFile.startTimeOffset}" ${outputFile}`;

    console.log("individual command:\n", cmd);

    child = exec(cmd, function (error, stdout, stderr) {
      if (error !== null) {
        console.log("exec error: " + error);
      }
    });

    // add to our list of inputs for the big merge
    inputs += ` -itsoffset ${oneFile.startTimeOffset} -acodec libopus -i ${inputFile} `;
    // inputs += ` -itsoffset ${oneFile.startTimeOffset} -i ${inputFile}.wav `;

  });

  // now mix it down into one wav file.
  cmd = `ffmpeg -y -loglevel warning ${inputs} -filter_complex amix=inputs=${script.files.length}:duration=longest:dropout_transition=3 ${archive_path}/mixed-${archiveId}.wav`;

  console.log("command:\n", cmd);

  child = exec(cmd, function (error, stdout, stderr) {
    if (error !== null) {
      console.log("Mixdown error: " + error);
    }
  });

  console.log(`\n\nDone Processing! Files can be found in ${archive_path}\n`)
  //   // remove temp files
  //   fs.unlinkSync(archiveId + "-list.txt");
  //   chunks.forEach(function(chunk) {
  //     console.log("Removing", chunk);
  //     fs.unlinkSync(chunk);
  //   });
});
