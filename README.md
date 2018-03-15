# js.tensorflow.org

This repo is for the website for TensorFlow.js. THe site is built using Hexo (a static site generator) that puts static assets in to the `public` folder.

### Development

You need node.js yarn and git to use this repo effectively. Note that it clones the repos for tfjs-core and tfjs-layers (as git submodules) in order to build API docs.

After checking out this repo run

```
yarn prep
```

This will download the two git submodules (or if you have already downloaded them before **will pull down changes from master**) and then install the project dependencies. Once this is done run

```
yarn serve
```

To start a dev server for the site. You should be able to make changes to the site and see them reflected in the dev server

When you pull new commits from git you should run `yarn prep` again.

### API Documentation Changes

Updating the API docs is a bit more involved as they are built from the sources of tfjs-core and tfjs-layers. To edit the docs and see changes reflected in the site you can edit the repositories that are located in `libs`. Make sure to do `git checkout master` or make a new branch for your changes.

Once you make an edit run

```
yarn build-api
```

To regenerate the API json.

**Note:** Right now docs build off of master for the two branches. This is going to change, they will in future default to build off of the specific tag indicated by the package.json of tfjs. There will be an option to override this to build off of master. So this step is subject to change (it will have more options) once the npm repos have stabilized.

Refreshing the page on the website should allow you to see your changes. You may need restart the dev server if you are generating a new version of the docs.

When your change is ready to submit, commit your changes and then push them to github to make a PR (make sure to use a branch other than master).

Once the your changes have been accepted into the repo in question, you can run `yarn prep` again in this repo (tfjs-website) to sunc everything up. You can then commit the new submodule info if you like (this step is necessary to after the PR is submitted because the SHA may have changed after merge).


### Deployment

To build the site run

```
yarn build
```

We use firebase to deploy the site, this is a WIP so I will update this section soon.
