export type Drawer = 'Businesses'|'Models'|'Rig'|'Agents'|'Upgrades'|'Projects'|'Funding';
export interface UiState {
 drawer:Drawer|null;
 disclosures:Record<string,boolean>;
}
export const createUiState=():UiState=>({drawer:null,disclosures:{}});
export const legacyTab=(drawer:Drawer|null)=>drawer==='Rig'?'Hardware':drawer==='Agents'?'SlopClaw':drawer==='Models'||drawer==='Funding'?drawer:'Work';
