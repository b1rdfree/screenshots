import React, { memo, ReactElement } from 'react'
import './index.less'

const infoToSizes: Record<number, number> = {
  3: 8,
  6: 12,
  9: 16,
}

export interface SizeProps {
  value: number
  onChange: (value: number) => void
}

export default memo(function ScreenshotsSize ({ value, onChange }: SizeProps): ReactElement {
  const sizes = [3, 6, 9]
  return (
    <div className='screenshots-size'>
      {sizes.map(size => {
        const classNames = ['screenshots-size-item']

        if (size === value) {
          classNames.push('screenshots-size-active')
        }

        return (
          <div key={size} className={classNames.join(' ')} onClick={() => onChange && onChange(size)}>
            <div
              className='screenshots-size-pointer'
              style={{
                width: infoToSizes[size],
                height: infoToSizes[size]
              }}
            />
          </div>
        )
      })}
    </div>
  )
})
