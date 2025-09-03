import React from 'react';

export function Button(props: any) {
  const { children, className, ...rest } = props;
  return (
    <button {...rest} className={(className || '') + ' btn'}>{children}</button>
  );
}

export default Button;
