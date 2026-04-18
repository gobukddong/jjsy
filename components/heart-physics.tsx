'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import Matter from 'matter-js'

export interface HeartPhysicsRef {
  addHeart: () => void
}

const HeartPhysics = forwardRef<HeartPhysicsRef>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const heartsRef = useRef<Matter.Body[]>([])
  const isCleaningRef = useRef<boolean>(false)

  useImperativeHandle(ref, () => ({
    addHeart: () => {
      if (!engineRef.current || isCleaningRef.current) return
      
      const { world } = engineRef.current
      // 더 위쪽에서 생성
      const x = 100 + (Math.random() * 40 - 20)
      const y = 40
      
      // Using circle for hitbox as requested
      const heart = Matter.Bodies.circle(x, y, 15, {
        restitution: 0.3,
        friction: 0.5,
        frictionAir: 0.05, // 공기 저항 추가
        render: {
          sprite: {
            texture: 'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="rgb(244, 63, 94)">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            `),
            xScale: 1,
            yScale: 1
          }
        }
      })
      
      Matter.Composite.add(world, heart)

      // 툭 튀어나오는 느낌을 위해 초기 속도 부여 (오른쪽 비중을 크게 하여 비산)
      Matter.Body.setVelocity(heart, { 
        x: Math.random() * 12 - 3, // -3 ~ 9 사이의 속도로 왼쪽도 가끔 가지만 대부분 오른쪽으로 날아감
        y: -Math.random() * 12 - 6 
      })
      
      // 랜덤한 회전 속도 부여
      Matter.Body.setAngularVelocity(heart, Math.random() * 0.2 - 0.1)

      heartsRef.current.push(heart)
    }
  }))


  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return

    const engine = Matter.Engine.create()
    engine.gravity.y = 0.6 // 중력 약화 (천천히 떨어지게)
    engineRef.current = engine
    const { world } = engine

    const render = Matter.Render.create({
      element: containerRef.current,
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent'
      }
    })

    // Ground and Walls
    const wallOptions = { 
      isStatic: true, 
      render: { visible: false },
      friction: 0.5
    }
    const ground = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions)
    const leftWall = Matter.Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)
    const rightWall = Matter.Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions)

    Matter.Composite.add(world, [ground, leftWall, rightWall])

    Matter.Render.run(render)

    let animationFrameId: number
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60)
      animationFrameId = requestAnimationFrame(loop)
    }
    loop()

    // Vortex Logic & Cleanup
    Matter.Events.on(engine, 'beforeUpdate', () => {
      const hearts = heartsRef.current

      // 1. 임계값 체크 (청소 중이 아닐 때만)
      if (!isCleaningRef.current) {
        if (hearts.length > 100) {
          isCleaningRef.current = true
        } else {
          const screenHeight = window.innerHeight
          const thresholdY = screenHeight * 0.3
          // 생성 지점(y=70)에서 충분히 멀어지고(y>150), 멈춰있는 하트가 임계점보다 높이 있을 때만
          const isTooHigh = hearts.some(h => 
            h.position.y > 150 && 
            h.position.y < thresholdY && 
            Math.abs(h.velocity.y) < 0.1
          )
          if (isTooHigh) isCleaningRef.current = true
        }
      }

      if (!isCleaningRef.current) return

      // Vacuum position: Bottom right
      const vacuumPos = { x: window.innerWidth - 50, y: window.innerHeight - 50 }
      
      for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i]
        
        // Remove staticness if any (though they are not static by default here)
        if (heart.isStatic) Matter.Body.setStatic(heart, false)

        const dx = vacuumPos.x - heart.position.x
        const dy = vacuumPos.y - heart.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Removal logic
        if (distance < 20) {
          Matter.Composite.remove(world, heart)
          hearts.splice(i, 1)
          continue
        }

        // Attractive Force Logic: F = (Pvac - Pheart) / dist * power
        const power = 0.002
        const force = {
          x: (dx / distance) * power,
          y: (dy / distance) * power
        }
        
        Matter.Body.applyForce(heart, heart.position, force)
        
        // Scale down effect as it gets closer
        if (distance < 400) {
          // Slowly shrink. Matter.Body.scale is relative, so we use a factor very close to 1
          const shrinkFactor = 0.97 
          Matter.Body.scale(heart, shrinkFactor, shrinkFactor)
        }
      }

      if (hearts.length === 0) {
        isCleaningRef.current = false
      }
    })

    const handleResize = () => {
      render.canvas.width = window.innerWidth
      render.canvas.height = window.innerHeight
      Matter.Body.setPosition(ground, { x: window.innerWidth / 2, y: window.innerHeight + 50 })
      Matter.Body.setPosition(rightWall, { x: window.innerWidth + 50, y: window.innerHeight / 2 })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      Matter.Render.stop(render)
      Matter.Engine.clear(engine)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <canvas ref={canvasRef} />
    </div>
  )
})

HeartPhysics.displayName = 'HeartPhysics'

export default HeartPhysics
