interface DateGroupItemProps {
  date: string
}

export default function DateGroupItem({ date }: DateGroupItemProps) {
  return <div className="date-group">{date}</div>
}
