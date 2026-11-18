"use client"

import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const userActivityData = [
  { name: "Jan", logins: 120, signups: 40 },
  { name: "Feb", logins: 150, signups: 55 },
  { name: "Mar", logins: 180, signups: 70 },
  { name: "Apr", logins: 200, signups: 85 },
  { name: "May", logins: 250, signups: 90 },
  { name: "Jun", logins: 300, signups: 100 },
  { name: "Jul", logins: 350, signups: 120 },
]

const symptomChecksData = [
  { name: "Mon", checks: 58 },
  { name: "Tue", checks: 65 },
  { name: "Wed", checks: 42 },
  { name: "Thu", checks: 70 },
  { name: "Fri", checks: 85 },
  { name: "Sat", checks: 52 },
  { name: "Sun", checks: 43 },
]

export default function AdminCharts() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Activity</CardTitle>
              <CardDescription>User logins and sign-ups over time</CardDescription>
            </div>
            <Select defaultValue="7d">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              logins: { label: "Logins", color: "hsl(var(--chart-1))" },
              signups: { label: "Sign-ups", color: "hsl(var(--chart-2))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userActivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="logins" stroke="var(--color-logins)" name="Logins" strokeWidth={2} />
                <Line type="monotone" dataKey="signups" stroke="var(--color-signups)" name="Sign-ups" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Symptom Checks</CardTitle>
              <CardDescription>Number of symptom checks per day</CardDescription>
            </div>
            <Select defaultValue="7d">
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              checks: { label: "Symptom Checks", color: "hsl(var(--chart-3))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptomChecksData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="checks" fill="var(--color-checks)" name="Checks" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}