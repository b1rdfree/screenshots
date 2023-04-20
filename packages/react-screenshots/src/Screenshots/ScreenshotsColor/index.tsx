import React, { memo, ReactElement } from 'react'
import './index.less'

export interface ColorProps {
  value: string
  onChange: (value: string) => void
}

export default memo(function ScreenshotsColor ({ value, onChange }: ColorProps): ReactElement {
  const colors = ['#F6544A', '#FDE82F', '#19DC7D', '#1F7CF9', '#31343F', '#85899E', '#FFFFFF']
  return (
    <div className='screenshots-color'>
      {colors.map(color => {
        const classNames = ['screenshots-color-item']
        if (color === value) {
          classNames.push('screenshots-color-active')
        }
        if(color === "#FFFFFF") {
          classNames.push('screenshots-color-white')
        }
        return (
          <div
            key={color}
            className={classNames.join(' ')}
            style={{ backgroundColor: color }}
            onClick={() => onChange && onChange(color)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.5 4.5L6.5 11.5L3 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
})
