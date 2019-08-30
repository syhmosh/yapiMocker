# yapiMocker

`yapiMocker` is a yapi mock middleware based on [mocker-api](https://github.com/jaywcjlove/mocker-api).

### Installation

`npm install yapi-mocker --save-dev`

### Use Cases

```js
yapiMocker(app, {
// yapi server  
server: 'http://10.129.17.73:9999',
// yapi project tokens
tokens: [
  'e655cbd33d8fc9158a87e4926eb49c9e9e2000b6e86d5b1e65f32ca60bb8f57a'
],
// local mock files
watchFiles: path.resolve('./mock/index.js')
});
```