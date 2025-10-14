'use client'

import React from 'react'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function DoughnutChart(props: React.ComponentProps<typeof Doughnut>) {
  return <Doughnut {...props} />
}

