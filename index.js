const { join } = require('path');
const chalk = require('chalk');
const axios = require('axios');
const { stringify } = require('querystring');
const apiMocker = require('mocker-api');
const crypto = require('crypto');
const { writeFileSync, mkdirSync } = require('fs');
const glob = require('glob');

module.exports = (app, conf = {}) => {
  const {
    output = join(process.cwd(), 'yapiMock'),
    server,
    tokens,
    watchFiles,
    expirys = false
  } = conf;

  const yapiMockFiles = glob.sync(join(output, './*.json'));
  let mocks = yapiMockFiles.reduce((pre, mockFile) => {
    pre[mockFile.match(/\/(\w*)\.json/)[1]] = require(mockFile);
    return pre;
  }, {});

  mkdirSync(output, { recursive: true });
  if (server === undefined || tokens === undefined) {
    throw new Error(chalk.red('server or tokens required!.'));
  }

  let projects = {};
  axios
    .all(tokens.map(token =>
      axios.get(
        new URL(`api/project/get?${stringify({token: token})}`, server).toString(), {
          timeout: 5000
        })
    ))
    .then((response) => {
      response.forEach(({ data }, index) => {
        const { errcode } = data;
        if (errcode !== 0) {
          return console.log(chalk.red(`Failed to get project via token: ${chalk.yellow(tokens[index])}.`));
        }
        let project = data.data;
        projects[`${project.basepath}/(.*)`] = new URL(
          `mock/${project._id}`,
          server
        ).toString();
        console.log(`${chalk.bgGreen(' Done: ')} fetch yapi project meta ${chalk.green(project.name)}`);
      });
    })
    .catch((err) => {
      // match output files
      projects['/(.*)'] = new URL('mock', server).toString();
      console.warn(`${chalk.bgYellow(' Warn: ')} failed to fetch yapi project meta, use local file instead`);
    })
    .finally(() => {
      let keyLength = Object.keys(projects).length;

      apiMocker(app, watchFiles, {
        proxy: projects,
        httpProxy: {
          listeners: {
            start(req, res) {
              req.on('end', () => {
                const fingerprint = req.url + req.method;
                const hashcode = crypto
                  .createHash('sha256')
                  .update(fingerprint, 'utf8')
                  .digest('hex');

                const cached = mocks[hashcode];
                if (cached !== undefined && expirys === false) {
                  return res.json(cached);
                }
                if (keyLength === 1) {
                  res
                    .status(404)
                    .send('Not found');
                }

                req.hashcode = hashcode;
              });
            },
            proxyRes(proxyRes, req, res) {
              let body = '';
              proxyRes.on('data', (chunk) => {
                body += chunk;
              });
              proxyRes.on('end', () => {
                body = Buffer.from(body).toString();
                if(req.hashcode !== undefined) {
                  mocks[req.hashcode] = JSON.parse(body);
                  writeFileSync(join(output, `${req.hashcode}.json`), body);
                }
              });
            },
          }
        },
      });
    });
};