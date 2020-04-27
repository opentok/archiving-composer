const fetch = require('node-fetch');

fetch('https://api.github.com/users/stevenh44')
.then(data => data.json())
.then(user => user.login)
// .then(outputUsername)
.then(username => {
    console.log(`${username}`)
})

function outputUsername(text){
    return new Promise((resolve, reject) => {
        console.log('test');
        resolve(text)
        
    })
}


// result.on("close", function () {
//     uploadFile(archive_path + '/'+ oneFile.filename + '.wav', bucket, unzippedLocation + '/' + oneFile.filename + '.wav');
//     console.log("file uploaded");
//   })