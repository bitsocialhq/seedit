root_path=$(cd `dirname $0` && cd .. && pwd)
cd "$root_path"

# install node_modules
if [[ ! -f node_modules ]]
then
  yarn || { echo "Error: failed installing 'node_modules' with 'yarn'" ; exit 1; }
fi

# download ipfs clients
node electron/download-ipfs || { echo "Error: failed script 'node electron/download-ipfs'" ; exit 1; }

dockerfile='
FROM node:22

# install node_modules
WORKDIR /usr/src/seedit
COPY ./package.json .
COPY ./yarn.lock .
RUN yarn

# copy source files and configs
COPY ./bin ./bin
COPY ./electron ./electron
COPY ./src ./src
COPY ./public ./public
COPY ./forge.config.js ./forge.config.js
COPY ./vite.config.js ./vite.config.js
COPY ./tsconfig.json ./tsconfig.json
COPY ./index.html ./index.html

# react build
RUN yarn build
'

# build electron-forge docker image
# temporary .dockerignore to save build time
echo $'node_modules\ndist' > .dockerignore
echo "$dockerfile" | sudo docker build \
  . \
  --tag seedit-electron-forge \
  --file -
rm .dockerignore

# build linux binary
sudo docker run \
  --name seedit-electron-forge \
  --volume "$root_path"/dist:/usr/src/seedit/dist \
  --rm \
  seedit-electron-forge \
  yarn electron:build:linux

# build windows binary
sudo docker run \
  --name seedit-electron-forge \
  --volume "$root_path"/dist:/usr/src/seedit/dist \
  --rm \
  seedit-electron-forge \
  yarn electron:build:windows
