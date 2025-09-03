import React from 'react';
export function Separator(props:any){
  return <div className={(props.className||'') + ' separator'} style={{height:1, background:'#eee', width:'100%'}} />;
}
export default Separator;
