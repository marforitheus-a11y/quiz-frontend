import React from 'react';
export function Card(props: any){
  const { children, className } = props;
  return <div className={(className||'') + ' card'}>{children}</div>;
}
export default Card;
