export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`bg-branco border border-borda p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}
