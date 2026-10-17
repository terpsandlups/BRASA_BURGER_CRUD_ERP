export default function Card({ className = '', children, ...props }) {
  return (
    <div className={`ui-card p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}
