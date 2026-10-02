import fs from 'node:fs/promises';
const read=async file=>JSON.parse(await fs.readFile('artifacts/'+file,'utf8'));
const fixtures='scripts/fixtures';await fs.mkdir(fixtures,{recursive:true});
const write=(name,data)=>fs.writeFile(fixtures+'/'+name,JSON.stringify(data,null,2));
await write('characters.json',await read('hsin-source-characters.json'));
const roles=await read('hsin-source-encoreCharacters.json');
await write('encore-characters.json',{roleList:roles.roleList.map(({Id,Name,QualityId,Element,WeaponType,RoleHeadIcon})=>({Id,Name,QualityId,Element,WeaponType,RoleHeadIcon}))});
const d=await read('hsin-detail-1311.json');
await write('hsin-detail.json',{Name:d.Name,QualityId:d.QualityId,MaxLevel:d.MaxLevel,Introduction:d.Introduction,FormationRoleCard:d.FormationRoleCard,RolePortrait:d.RolePortrait,RoleHeadIconLarge:d.RoleHeadIconLarge,Properties:d.Properties.map(p=>({Name:p.Name,BaseValue:p.BaseValue,GrowthValues:p.GrowthValues.filter(v=>v.level===90)})),Skills:d.Skills.map(({SkillType,SkillName,SkillDescribe})=>({SkillType,SkillName,SkillDescribe}))});
const feed=await fs.readFile('artifacts/hsin-source-feed.txt','utf8');
const entries=[...feed.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map(m=>m[0]).filter(entry=>entry.includes('urn:article:5546'));
await fs.writeFile(fixtures+'/convenes-3.7.xml','<feed>'+entries.join('')+'</feed>');
const html=await fs.readFile('artifacts/hsin-source-youtube.txt','utf8');
const marker='var ytInitialData = ',start=html.indexOf(marker),end=html.indexOf(';</script>',start);
const data=JSON.parse(html.slice(start+marker.length,end));
const videos=[];
function visit(node){if(!node||typeof node!=='object')return;if(node.lockupViewModel){const v=node.lockupViewModel,title=v.metadata?.lockupMetadataViewModel?.title?.content;if(/Resonator Showcase/i.test(title || ''))videos.push({lockupViewModel:{contentId:v.contentId,metadata:{lockupMetadataViewModel:{title:{content:title}}}}});}for(const value of Object.values(node))visit(value);}
visit(data);
await fs.writeFile(fixtures+'/official-channel.html','var ytInitialData = '+JSON.stringify({metadata:{channelMetadataRenderer:{externalId:data.metadata.channelMetadataRenderer.externalId}},contents:videos})+';</script>');
