import { BrushData, BrushEditData } from '.'
import { HistoryItemSource } from '../../types'

export default function draw (ctx: CanvasRenderingContext2D, action: HistoryItemSource<BrushData, BrushEditData>): void {
  const { size, color, points } = action.data
  let setSize = size
  let setColor = color
  let isDel = false
  for(let {data} of action.editHistory){
    setSize = data.size ? data.size : setSize
    setColor = data.color ? data.color : setColor
    isDel = data.isDel
  }

  if(isDel) return

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = setSize
  ctx.strokeStyle = setColor

  const distance = action.editHistory.reduce(
    (distance, { data }) => ({
      x: distance.x + data.x2 - data.x1,
      y: distance.y + data.y2 - data.y1
    }),
    { x: 0, y: 0 }
  )

  ctx.beginPath()
  points.forEach((item, index) => {
    if (index === 0) {
      ctx.moveTo(item.x + distance.x, item.y + distance.y)
    } else {
      ctx.lineTo(item.x + distance.x, item.y + distance.y)
    }
  })
  ctx.stroke()

  if (action.isSelected) {
    ctx.lineWidth = 1
    ctx.strokeStyle = '#000000'
    ctx.beginPath()
    points.forEach((item, index) => {
      if (index === 0) {
        ctx.moveTo(item.x + distance.x, item.y + distance.y)
      } else {
        ctx.lineTo(item.x + distance.x, item.y + distance.y)
      }
    })
    ctx.stroke()
  }
}
