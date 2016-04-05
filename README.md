# archiving-composer

Sample apps for using ffmpeg to generate composed files from OpenTok individual stream Archives.

[composer.js](composer.js) - This command-line script takes an archive.zip file as the input and outputs a composed file with the names of each individual displayed under them. It uses the connectionData of each participant as the name. You can provide the connectionData when you create a token for each participant. For more information have a look at the [opentok documentation](https://tokbox.com/opentok/libraries/client/js/reference/Connection.html).

## Installing

You need to make sure you have installed
* node.js v4+
* ffmpeg with all of its dependencies.

### OSX

`brew install ffmpeg --with-fdk-aac --with-ffplay --with-freetype --with-libass --with-libquvi --with-libvorbis --with-libvpx --with-opus ----with-x264`

Then checkout this repo and run `npm install`.

### Ubuntu Linux 15.04+

`sudo apt-get install nodejs npm ffmpeg`

Then checkout this repo and run `npm install`.

### Ubuntu Linux 14.04

`sudo apt-get install nodejs npm`

Then, to install ffmpeg:

```
  sudo add-apt-repository ppa:mc3man/trusty-media
  sudo apt-get update
  sudo apt-get dist-upgrade
  sudo apt-get install ffmpeg
```

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
