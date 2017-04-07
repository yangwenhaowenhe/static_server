var fs = require('fs');
var Path = require('path');
var http = require('http');

const testPath = __dirname;

// const promiseReadDir = (path)=>{
//     return new Promise((resolve,reject)=>{
//         fs.readdir(path,(err,files)=>{
//             if(err){
//                 reject(err)
//             }
//             resolve(files)
//         })
//     })
// }
const promisefy = (func) => {
    return function() {
        let args = [].slice.call(arguments);
        return new Promise((resolve, reject) => {
            args.push((err, result) => {
                if (err) {
                    reject(err)
                }
                console.log('result: ',result)
                resolve(result)
            })
            // console.log('args:　',args)
            func.apply(undefined, args)
        }).catch((err)=>{
            console.log('error： ',err)
        })
    }
}

const promiseFsStat = promisefy(fs.stat)

const renderHtml = (res) => (files) => {
    let str = '<!doctype html><ul><meta charset="utf-8">';
    console.log('files: ', files)
    files.forEach((v, i) => {
        console.log('v: ',v)
        str += (`<li><a href=${v.path}>${v.type === 'directory' ? '文件夹' : '文件'+' '+v.path}</a></li>`)
    })
    str += '</ul></html>';
    res.setHeader('content-type', 'text/html')
    res.end(str)
}

// const testType = (path) => {
//     let fullPath = Path.join(testPath, path);
//     return
//     promiseFsStat(fullPath)
//         .then((stats) => {
//             let result = { path };
//             if (stats.isDirectory()) {
//                 result.type = 'directory'
//             }
//             if (stats.isFile()) {
//                 result.type = 'file'
//             }
//             return result
//         })
// }

const readDir = (path, callback) => {
    let fullPath = Path.join(testPath, path);
    fs.readdir(fullPath, (err, files) => {
        let promises = files.map((v, i) => 
            promiseFsStat(v).then((stats) => {
                let result = {path:  v };
                if (stats.isDirectory()) {
                    result.type = 'directory'
                }
                if (stats.isFile()) {
                    result.type = 'file'
                }
                console.log('result: ',result)
                return result
            })
        )

        Promise.all(promises)
            .then((arr) => {
                console.log('arr: ',arr)
                callback(arr)
            })
    })
}

http.createServer((req, res) => {
    console.log('req', req.url)
    if(req.url === '/favicon.ico'){
        res.statusCode = 404;
        res.end()
    }else{
        readDir(req.url, renderHtml(res))
    }
}).listen(8000)

