import { ImageResponse } from 'next/og'
 
// Route segment config
export const runtime = 'nodejs'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
// Image generation
export default function Icon() {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 20,
            background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '8px',
          }}
        >
          G
        </div>
      ),
      // ImageResponse options
      {
        // For convenience, we can re-use the exported icons size metadata
        // config to also set the ImageResponse's width and height.
        ...size,
      }
    )
  } catch (error) {
    console.error('Error generating icon:', error)
    // Fallback to a simple text response
    return new Response('G', {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
} 