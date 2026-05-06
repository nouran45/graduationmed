"use client"

import { useState } from "react"
import { ArrowUpRight, Users, Activity, FileText, AlertTriangle, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"

// this is some mock data added for now
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

const conditionMatchData = [
  { name: "Contact Dermatitis", value: 35 },
  { name: "Eczema", value: 25 },
  { name: "Rosacea", value: 15 },
  { name: "Psoriasis", value: 10 },
  { name: "Acne", value: 15 },
]


const recentUsers = [
  { id: 1, name: "Sarah Johnson", email: "sarah.j@example.com", registered: "2 days ago", status: "active" },
  { id: 2, name: "Michael Chen", email: "michael.c@example.com", registered: "5 days ago", status: "active" },
  { id: 3, name: "Emily Rodriguez", email: "emily.r@example.com", registered: "1 week ago", status: "inactive" },
  { id: 4, name: "David Kim", email: "david.k@example.com", registered: "2 weeks ago", status: "active" },
  { id: 5, name: "Lisa Walker", email: "lisa.w@example.com", registered: "1 month ago", status: "active" },
]

export default function AdminDashboard() {
  const [period, setPeriod] = useState("7d")

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-secondary">Admin Dashboard</h2>
            <p className="text-gray-500">Monitor system performance and user activities</p>
          </div>
          <div className="flex items-center gap-3">
            <Select defaultValue={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button>Generate Report</Button>
          </div>
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <h4 className="text-2xl font-bold">2,546</h4>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span>12%</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1 w-full bg-gray-100 rounded-full">
                <div className="h-1 bg-primary rounded-full" style={{ width: "75%" }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">75% of target</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                  <h4 className="text-2xl font-bold">854</h4>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span>8%</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1 w-full bg-gray-100 rounded-full">
                <div className="h-1 bg-blue-500 rounded-full" style={{ width: "68%" }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Current active users</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Symptom Checks</p>
                  <h4 className="text-2xl font-bold">1,248</h4>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span>23%</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1 w-full bg-gray-100 rounded-full">
                <div className="h-1 bg-purple-500 rounded-full" style={{ width: "85%" }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Today's symptom checks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">System Issues</p>
                  <h4 className="text-2xl font-bold">3</h4>
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-red-600">
                <ArrowUpRight className="h-4 w-4" />
                <span>1</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-1 w-full bg-gray-100 rounded-full">
                <div className="h-1 bg-amber-500 rounded-full" style={{ width: "15%" }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Requires attention</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                logins: {
                  label: "Logins",
                  color: "hsl(var(--chart-1))",
                },
                signups: {
                  label: "Sign-ups",
                  color: "hsl(var(--chart-2))",
                },
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
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke="var(--color-signups)"
                    name="Sign-ups"
                    strokeWidth={2}
                  />
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
                checks: {
                  label: "Symptom Checks",
                  color: "hsl(var(--chart-3))",
                },
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

      {/* Additional analytics and data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Recently registered user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-gray-500 pb-3">User</th>
                    <th className="text-left font-medium text-gray-500 pb-3">Registered</th>
                    <th className="text-left font-medium text-gray-500 pb-3">Status</th>
                    <th className="text-left font-medium text-gray-500 pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-500">{user.registered}</td>
                      <td className="py-3">
                        <div
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.status}
                        </div>
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center border-t px-6 py-3">
            <p className="text-sm text-gray-500">Showing 5 of 120 users</p>
            <Button variant="outline" size="sm">
              View All Users
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Conditions</CardTitle>
            <CardDescription>Most matched conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conditionMatchData.map((condition, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{condition.name}</span>
                    <span className="text-sm text-gray-500">{condition.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${condition.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system performance and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-green-600">120ms</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: "25%" }}></div>
              </div>
              <span className="text-xs text-gray-500">Excellent</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Server Load</span>
                <span className="text-sm text-yellow-600">65%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div className="h-2 bg-yellow-500 rounded-full" style={{ width: "65%" }}></div>
              </div>
              <span className="text-xs text-gray-500">Normal</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <span className="text-sm text-green-600">Connected</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: "100%" }}></div>
              </div>
              <span className="text-xs text-gray-500">Healthy</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Storage</span>
                <span className="text-sm text-blue-600">43% used</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div className="h-2 bg-blue-500 rounded-full" style={{ width: "43%" }}></div>
              </div>
              <span className="text-xs text-gray-500">8.6 GB / 20 GB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
