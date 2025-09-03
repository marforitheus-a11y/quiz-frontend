import React from 'react';
export function Checkbox(props:any){
  const { checked, onCheckedChange, id } = props;
  return <input id={id} type="checkbox" checked={!!checked} onChange={(e)=> onCheckedChange && onCheckedChange(e.target.checked)} />;
}
export default Checkbox;
