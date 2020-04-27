// variables for testing 
const bucket = "storycorps-signature-remote"
const account = "46565552"
const interview = "f105311e-e144-49fb-87ae-b63a341a18fe"
const interviewId = "sdhTest 2020-4-16 23:59:17"
const name = interview

// Load the SDK and UUID
var AWS = require('aws-sdk');
// Create an S3 client
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var params = {Bucket: bucket, Key: zippedKey};
tmp_file_name = './tmp/' + name + '/archive.zip'
fs.mkdir('./tmp/' + name, { recursive: true }, (err) => {
  if (err) throw err;
});
fs.writeFile(tmp_file_name, "Hello World!", function(err) {
  if(err) {
      return console.log(err);
  }
});

var temp_dir = './tmp/' + name;



var fs = require("fs"),
  exec = require("child_process").execSync,
  fs = require("fs"),
  program = require("commander"),
  path = require("path"),
  unzip = require("unzip-stream"),
  child;

const zippedKey = account + "/" + interview + "/archive.zip"
const unzippedLocation = account + "/" + interview

var errHandler = function(err) {
  console.log(err);
}

async function downloadFile (params, tmp_file_name){
  return new Promise((resolve, reject) => {
    console.log("downloading file");
    var file = require('fs').createWriteStream(tmp_file_name);
    resolve(await s3.getObject(params).createReadStream().pipe(file));
    // resolve(result);
  })
}

async function unzipFile(tmp_file_name, unzip, temp_dir){
  return new Promise((resolve, reject) => {
    console.log("unzipping");
    var unzipped = await fs.createReadStream(tmp_file_name).pipe(unzip.Extract({ path: temp_dir }))
    resolve(unzipped);
  })
}

function convert(tmp_file_name, unzip, temp_dir){
  return new Promise((resolve,reject) => {
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

        // console.log("individual command:\n", cmd);
        console.log("executing individual command for " + inputFile)

        child = exec(cmd, function (error, stdout, stderr) {
          if (error !== null) {
            console.log("exec error: " + error);
          }
        });
        uploadFile(archive_path + '/'+ oneFile.filename + '.wav', bucket, unzippedLocation + '/' + oneFile.filename + '.wav');

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

      //todo: upload the mixed file

      // console.log(`\n\nDone Processing! Files can be found in ${archive_path}\n`)
      resolve(`\n\nDone Processing! Files can be found in ${archive_path}\n`)
  })
}

const uploadFile = async(filePath, bucketName, key) => {
  return new Promise((resolve, reject) => {
    console.log("starting file upload: " + filePath)
    fs.readFile(filePath, (err, data) => {
      if (err){
        reject(err)
      }
      var base64data = new Buffer(data, 'binary');
      var params = {
        Bucket: bucketName,
        Key: key,
        Body: base64data
      };
      s3.upload(params, (err, data) => {
        if (err) console.error(`Upload Error ${err}`);
        resolve('Upload Completed');
      });
    });
  })
}

async function main(){
  await downloadFile(params, tmp_file_name);
  await unzipFile(tmp_file_name, unzip, temp_dir);
  await convert;
}
main()