/**
 * @license
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const Hexo = require('hexo');
const hexo = new Hexo(process.cwd(), {});

hexo.init().then(function() {
  hexo.call('generate', {}).then(function() {
    console.log('Done generating site');
    // Use process.exit this instead of hexo.exit() to avoid the default
    // before_exit handler. That handler will try and save the hexo database
    // but will error out as it hits the V8 string size limit.
    process.exit();
  });
});
