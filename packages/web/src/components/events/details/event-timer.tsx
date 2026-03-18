"use client"

import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

interface EventTimerProps {
  date: Date | string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date | string): TimeLeft {
  const endTime = new Date(targetDate).getTime()
  const now = Date.now()
  const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000))

  return {
    days: Math.floor(timeLeft / 86400),
    hours: Math.floor((timeLeft % 86400) / 3600),
    minutes: Math.floor((timeLeft % 3600) / 60),
    seconds: timeLeft % 60,
  }
}

export default function EventTimer({ date }: EventTimerProps) {
  const t = useTranslations("events")
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(date))
  const [mounted, setMounted] = useState(false)

  const updateCountdown = useCallback(() => {
    setTimeLeft(calculateTimeLeft(date))
  }, [date])

  useEffect(() => {
    setMounted(true)
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [updateCountdown])

  // Avoid hydration mismatch by showing placeholder until mounted
  if (!mounted) {
    return (
      <div className="event-timer event-timer--loading">
        <TimerUnit value={0} label={t("timer.days")} />
        <span className="event-timer__separator">:</span>
        <TimerUnit value={0} label={t("timer.hours")} />
        <span className="event-timer__separator">:</span>
        <TimerUnit value={0} label={t("timer.min")} />
        <span className="event-timer__separator">:</span>
        <TimerUnit value={0} label={t("timer.sec")} />
      </div>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft

  // If event has already started
  if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
    return (
      <span className="event-profile-hero__status event-profile-hero__status--in-progress">
        <i className="bx bx-play-circle" />
        {t("timer.inProgress")}
      </span>
    )
  }

  return (
    <div className="event-timer">
      <TimerUnit value={days} label={t("timer.days")} />
      <span className="event-timer__separator">:</span>
      <TimerUnit value={hours} label={t("timer.hours")} />
      <span className="event-timer__separator">:</span>
      <TimerUnit value={minutes} label={t("timer.min")} />
      <span className="event-timer__separator">:</span>
      <TimerUnit value={seconds} label={t("timer.sec")} />
    </div>
  )
}

function TimerUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="event-timer__unit">
      <span className="event-timer__value">{value.toString().padStart(2, "0")}</span>
      <span className="event-timer__label">{label}</span>
    </div>
  )
}
