var fs = require('fs');
var Path = require('path');
var http = require('http');
var url = require('url');
var mime = require('mime');


const testPath = __dirname;
const filePathMap = {};

const promisefy = (func) => {
    return function () {
        let args = [].slice.call(arguments);
        return new Promise((resolve, reject) => {
            args.push((err, result) => {
                if (err) {
                    reject(err)
                }
                // console.log('result: ', result)
                resolve(result)
            })
            // console.log('args:　',args)
            func.apply(undefined, args)
        }).catch((err) => {
            console.log('error： ', err)
        })
    }
}

const promiseFsStat = promisefy(fs.lstat)

const renderHtml = (res) => (files) => {
    console.log('files: ', files)
    let str = '<!doctype html><ul><meta charset="utf-8">';
    // console.log('files: ', files)
    files.forEach((v, i) => {
        // console.log('v: ', v)
        str += (`<li><a href=${v.path}>${v.type === 'directory' ? '文件夹' + v.path : '文件' + v.path}</a></li>`)
    })
    str += '</ul></html>';
    res.setHeader('content-type', 'text/html')
    res.end(str)
}


const readDir = (path, callback) => {
    // let fullPath = Path.join(testPath, path);
    console.log('path: ', path)
    fs.readdir(path, (err, files) => {
        if (err) {
            throw (err)
        }
        if (files) {
            let promises = files.map((v, i) =>
                promiseFsStat(Path.join(path, v)).then((stats) => {
                    let result = { path: Path.join(path.split(Path.sep).pop(), v) };
                    if (stats.isDirectory()) {
                        result.type = 'directory'
                    }
                    else if (stats.isFile() && !stats.isDirectory()) {
                        let fullPathWithFilename = Path.join(path, v);
                        console.log('fullPathWithFilename: ', fullPathWithFilename)
                        filePathMap[fullPathWithFilename] = {};
                        filePathMap[fullPathWithFilename].type = mime.lookup(fullPathWithFilename);
                        result.type = 'file'
                    }
                    // console.log('result: ', result)
                    return result
                }).catch(err => console.log('error: ', err))
            )

            Promise.all(promises)
                .then((arr) => {
                    // console.log('arr: ', arr)
                    callback(arr)
                })
        }
    })
}

http.createServer((req, res) => {
    // console.log('req', req.url)
    let path = url.parse(req.url).path;
    console.log('path: ', path)
    if (path === '/favicon.ico') {
        res.statusCode = 404;
        res.end()
    } else {
        let fullPath = Path.join(testPath, path);
        let fileStream = filePathMap[fullPath];
        console.log(fullPath)
        console.log('fileStream: ', fileStream)
        if (fileStream) {
            res.setHeader('content-type', fileStream.type);
            let file = filePathMap[fullPath].file
            if (file) {
                res.end(file)
            } else {
                fs.readFile(fullPath, (err, file) => {
                    filePathMap[fullPath].file = file
                    res.end(file)
                })
            }
        } else {
            readDir(fullPath, renderHtml(res))
        }
    }
}).listen(8000)

