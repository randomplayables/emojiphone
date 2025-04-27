// import React from 'react'

// const EmojiCircle = () => (
//   <div className="flex justify-center items-center space-x-2 mt-4">
//     {/* Render emoji icons here */}
//   </div>
// )

// export default EmojiCircle

// import React from 'react'

const EmojiCircle = () => (
  <div className="relative w-64 h-64 mx-auto mt-6">
    {/* Placeholders: 6 emoji positions around a circle */}
    {['😀','🎉','🚀','🧠','🤖','🎮'].map((emoji, i) => {
      const angle = (i / 6) * 2 * Math.PI - Math.PI / 2
      const radius = 100
      const x = 128 + radius * Math.cos(angle)
      const y = 128 + radius * Math.sin(angle)
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            fontSize: '2rem',
          }}
        >
          {emoji}
        </div>
      )
    })}
  </div>
)

export default EmojiCircle