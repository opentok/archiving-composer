# archiving-composer

Sample apps for using ffmpeg to generate composed files from OpenTok individual stream Archives.

[composer.js](composer.js) - This script takes an archive.zip file as the input and outputs a composed file with the names of each individual displayed under them. It uses the connectionData of each participant as the name. You can provide the connectionData when you create a token for each participant. For more information have a look at the [opentok documentation](https://tokbox.com/opentok/libraries/client/js/reference/Connection.html).

## Installing

You need to make sure you have installed ffmpeg with all of the dependencies. On OSX you do this with:

`brew install ffmpeg --with-fdk-aac --with-ffplay --with-freetype --with-libass --with-libquvi --with-libvorbis --with-libvpx --with-opus ----with-x264`

Then checkout this repo and run `npm install`.

## Usage

```
  Usage: ./composer.js [options] -i <zipFile>

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -i, --input <zipFile>  Archive ZIP file
    -f, --format [type]    Output format [webm,mp4]
```

The zipfile is the output of the OpenTok individual stream archiving API.