# Individual stream archive processing tools

Sample apps for generating composed files from [OpenTok individual stream
archives](https://tokbox.com/developer/guides/archiving/#individual-stream-and-composed-archives):

* [composer.js](composer.js) - This command-line script takes an archive.zip file as
  the input and outputs a composed file with the names of each individual displayed 
  under them. It uses the connection data of each participant as the name. You can
  provide the connection data when you create a token for each participant. For more
  information, have a look at the
  [OpenTok documentation](https://tokbox.com/developer/sdks/js/reference/Connection.html).

  **NOTE:** Up to Node 12 supported.

* [BARC](https://github.com/wobbals/barc) - A batch archive processor with support
  for CSS-based layout management.

## Installing

You need to make sure you have installed FFmpeg with all of the dependencies. On Mac OS you do this with:

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

The ZIP file is the output of the OpenTok individual stream archiving API.
