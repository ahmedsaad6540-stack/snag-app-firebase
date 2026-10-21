'use strict';
/** Staging preflight: checks configuration without making network requests or revealing secrets. */
const fs = require('node:fs');
const path = require('node:path');
const {appConfig} = require('./config');
function preflight(env=process.env, manifest='') {
  const checks=[];
  const add=(key,pass,detail)=>checks.push({key,ok:Boolean(pass),detail});
  const target=(env.FIREBASE_PROJECT_ID||'').trim();
  add('firebase.production.prohibited',target!=='snag-app-firebase','Production target must never be used by this demo');
  add('firebase.staging.target',Boolean(target)&&target!=='snag-app-firebase','Use emulator or an isolated staging project');
  try{appConfig(env);add('backend.config',true,'Configured (tokens not displayed)');}
  catch(err){add('backend.config',false,err.message);}
  add('slack.allowed.workspace',/^T[A-Z0-9]+$/.test(env.SLACK_ALLOWED_TEAM_ID||''),'Workspace Team ID is required');
  add('slack.allowed.users',Boolean(env.SLACK_ALLOWED_USER_IDS),'At least one allowlisted user is required');
  const socketMode=env.SLACK_SOCKET_MODE==='true';
  const urls=[...manifest.matchAll(/https:\/\/[^\s]+?\/slack\/events/g)].map(m=>m[0]);
  if(socketMode){
    add('slack.manifest.socket',manifest.includes('socket_mode_enabled: true'),'Enable Socket Mode in the Slack app and generate an app-level token');
    add('slack.manifest.no.callbacks',urls.length===0,'Socket mode does not require public HTTPS callback URLs');
  }else{
    add('slack.manifest.callback',urls.length===3&&!urls.some(u=>u.includes('STAGING_HOST.example.com')),
      'Set a real HTTPS staging server in all 3 Slack callback URLs');
  }
  add('slack.manifest.home',manifest.includes('home_tab_enabled: true'),'App Home must be enabled');
  const dangerous=/(snag-app-firebase\.web\.app|console\.firebase\.google\.com\/project\/snag-app-firebase)/.test(manifest);
  add('slack.manifest.no.production',!dangerous,'No production URL should be a callback');
  return {ready:checks.every(c=>c.ok),checks};
}
if(require.main===module){
  const filename=process.env.SLACK_SOCKET_MODE==='true'?'app-manifest.socket-mode.yaml':'app-manifest.yaml';
  const manifest=fs.readFileSync(path.join(__dirname,'../'+filename),'utf8');
  const result=preflight(process.env,manifest);
  for(const check of result.checks)console.log(`${check.ok?'PASS':'BLOCK'} | ${check.key} | ${check.detail}`);
  process.exitCode=result.ready?0:1;
}
module.exports={preflight};
