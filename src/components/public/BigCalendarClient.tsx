'use client'

import { Calendar, Views, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

type EventType = { id: string; title: string; start: Date; end: Date }

export default function BigCalendarClient({
  events,
  onRangeChange,
}: {
  events: EventType[]
  onRangeChange: (r: { start: Date; end: Date } | Date[] | { start?: Date; end?: Date }) => void
}) {
  const localizer = momentLocalizer(moment)
  return (
    <Calendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      defaultView={Views.WEEK}
      views={[Views.DAY, Views.WEEK, Views.MONTH]}
      style={{ height: 600 }}
      onRangeChange={onRangeChange}
    />
  )
}

