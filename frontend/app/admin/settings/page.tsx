"use client"

import { useState } from "react"
import {
  Save,
  Settings,
  Database,
  Bell,
  Shield,
  Mail,
  Globe,
  FileText,
  FileQuestion,
  Layout,
  AlertTriangle,
  Upload,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function SystemSettings() {
  const [defaultTab, setDefaultTab] = useState("general")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [isUnsaved, setIsUnsaved] = useState(false)

  const handleInputChange = () => {
    setIsUnsaved(true)
  }



  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-secondary">System Settings</h2>
            <p className="text-gray-500">Configure and manage system settings and integrations</p>
          </div>
          <div className="flex items-center gap-3">
            {isUnsaved && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Unsaved changes
              </div>
            )}
            <Button onClick={handleSave} disabled={!isUnsaved}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} onValueChange={setDefaultTab} className="space-y-6">
        <div className="bg-white rounded-md border shadow-sm">
          <div className="p-1">
            <TabsList className="grid grid-cols-1 md:grid-cols-6 h-auto p-1">
              <TabsTrigger value="general" className="data-[state=active]:bg-muted py-2 rounded-md">
                <Settings className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:bg-muted py-2 rounded-md">
                <Layout className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-muted py-2 rounded-md">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-muted py-2 rounded-md">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="integrations" className="data-[state=active]:bg-muted py-2 rounded-md">
                <Database className="h-4 w-4 mr-2" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-muted py-2 rounded-md">
                <FileText className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure general system settings and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="site-name">Site Name</Label>
                    <Input id="site-name" defaultValue="MediCheck" onChange={handleInputChange} />
                    <p className="text-sm text-gray-500">The name of your medical platform as it appears to users.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site-description">Site Description</Label>
                    <Textarea
                      id="site-description"
                      defaultValue="MediCheck provides symptom checking and health condition identification. Fast, accurate, and private."
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-gray-500">A brief description of your platform for SEO and sharing.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="support-email">Support Email</Label>
                    <Input
                      id="support-email"
                      type="email"
                      defaultValue="support@medicheck.com"
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-gray-500">Email address for user support inquiries.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select defaultValue="UTC-5" onValueChange={handleInputChange}>
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select a timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                        <SelectItem value="UTC-7">Mountain Time (UTC-7)</SelectItem>
                        <SelectItem value="UTC-6">Central Time (UTC-6)</SelectItem>
                        <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                        <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Default timezone for displaying dates and times.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select defaultValue="MM/DD/YYYY" onValueChange={handleInputChange}>
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Format for displaying dates throughout the system.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Maintenance</CardTitle>
                  <CardDescription>Configure system maintenance and availability settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Temporarily disable access to the site for maintenance</p>
                    </div>
                    <Switch
                      id="maintenance-mode"
                      checked={maintenanceMode}
                      onCheckedChange={(checked) => {
                        setMaintenanceMode(checked)
                        setIsUnsaved(true)
                      }}
                    />
                  </div>

                  {maintenanceMode && (
                    <div className="space-y-2 border-l-4 border-amber-500 pl-4 py-2 bg-amber-50">
                      <Label htmlFor="maintenance-message">Maintenance Message</Label>
                      <Textarea
                        id="maintenance-message"
                        defaultValue="Our system is currently undergoing scheduled maintenance. We'll be back shortly. Thank you for your patience."
                        onChange={handleInputChange}
                      />
                      <p className="text-sm text-gray-500">
                        This message will be displayed to users during maintenance.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="debug-mode">Debug Mode</Label>
                      <p className="text-sm text-gray-500">Enable detailed error messages and logging</p>
                    </div>
                    <Switch id="debug-mode" onCheckedChange={handleInputChange} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-updates">Automatic Updates</Label>
                      <p className="text-sm text-gray-500">
                        Allow the system to update automatically when new versions are available
                      </p>
                    </div>
                    <Switch id="auto-updates" defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Current system status and information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">System Version</h3>
                    <p className="text-sm">MediCheck v2.5.3</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p className="text-sm">April 28, 2025, 10:45 AM</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Database Status</h3>
                    <div className="flex items-center text-sm text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span>Connected</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">License</h3>
                    <p className="text-sm">Professional Edition (Valid until May 15, 2026)</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    System Diagnostics
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common system maintenance tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileQuestion className="h-4 w-4 mr-2" />
                    View System Logs
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Backup System
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-amber-600">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

  
        <TabsContent value="appearance">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>Configure how your medical platform looks to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-4 items-center">
                      <Input
                        id="primary-color"
                        type="color"
                        defaultValue="#00843D"
                        className="w-16 h-10 p-1"
                        onChange={handleInputChange}
                      />
                      <Input value="#00843D" className="w-32" readOnly />
                    </div>
                    <p className="text-sm text-gray-500">Main brand color used throughout the platform.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-4 items-center">
                      <Input
                        id="secondary-color"
                        type="color"
                        defaultValue="#002855"
                        className="w-16 h-10 p-1"
                        onChange={handleInputChange}
                      />
                      <Input value="#002855" className="w-32" readOnly />
                    </div>
                    <p className="text-sm text-gray-500">Secondary brand color used throughout the platform.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo-upload">Logo</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-xl font-bold text-secondary">
                          <span className="text-primary">M</span>C
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Logo
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Upload your organization's logo (recommended size: 200x200px).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favicon-upload">Favicon</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">M</span>
                      </div>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New Favicon
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Upload a favicon for browser tabs (recommended size: 32x32px).
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Layout & Interface</CardTitle>
                  <CardDescription>Configure layout and interface elements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode Support</Label>
                      <p className="text-sm text-gray-500">Allow users to switch to dark mode</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact Layout</Label>
                      <p className="text-sm text-gray-500">Reduce spacing for a more compact interface</p>
                    </div>
                    <Switch onCheckedChange={handleInputChange} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show User Avatars</Label>
                      <p className="text-sm text-gray-500">Display user avatars instead of initials</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-family">Font Family</Label>
                    <Select defaultValue="inter" onValueChange={handleInputChange}>
                      <SelectTrigger id="font-family">
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="roboto">Roboto</SelectItem>
                        <SelectItem value="opensans">Open Sans</SelectItem>
                        <SelectItem value="lato">Lato</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">Primary font used throughout the platform.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>See how your changes will look</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-sm text-gray-500">Preview not available in demo</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Theme Templates</CardTitle>
                  <CardDescription>Apply pre-configured themes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className="bg-[#00843D] text-white h-20 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary"
                      onClick={handleInputChange}
                    >
                      <span className="font-semibold">Green</span>
                    </div>
                    <div
                      className="bg-[#0067B1] text-white h-20 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-600"
                      onClick={handleInputChange}
                    >
                      <span className="font-semibold">Blue</span>
                    </div>
                    <div
                      className="bg-[#8A2BE2] text-white h-20 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-purple-600"
                      onClick={handleInputChange}
                    >
                      <span className="font-semibold">Purple</span>
                    </div>
                    <div
                      className="bg-[#F97316] text-white h-20 rounded-lg flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-orange-600"
                      onClick={handleInputChange}
                    >
                      <span className="font-semibold">Orange</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

  
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how system notifications are sent and managed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>User Registration</Label>
                      <p className="text-sm text-gray-500">Send welcome email when new users register</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Symptom Check Results</Label>
                      <p className="text-sm text-gray-500">Email users their symptom check results</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Alerts</Label>
                      <p className="text-sm text-gray-500">Email administrators about system issues</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Admin Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New User Alerts</Label>
                      <p className="text-sm text-gray-500">Notify when new users register</p>
                    </div>
                    <Switch onCheckedChange={handleInputChange} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>System Error Alerts</Label>
                      <p className="text-sm text-gray-500">Notify on critical system errors</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and authentication options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Password Expiration</Label>
                      <p className="text-sm text-gray-500">Force password changes every 90 days</p>
                    </div>
                    <Switch defaultChecked onCheckedChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Password Length</Label>
                <Select defaultValue="8" onValueChange={handleInputChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 characters</SelectItem>
                    <SelectItem value="8">8 characters</SelectItem>
                    <SelectItem value="10">10 characters</SelectItem>
                    <SelectItem value="12">12 characters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>Manage external service integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="email">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      <div>
                        <div>Email Provider</div>
                        <div className="text-xs text-gray-500">Configured</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>SMTP Server</Label>
                        <Input defaultValue="smtp.example.com" onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input defaultValue="587" onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Username</Label>
                        <Input defaultValue="admin@example.com" onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password</Label>
                        <Input type="password" defaultValue="••••••••••••" onChange={handleInputChange} />
                      </div>
                      <Button size="sm">Test Connection</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="database">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      <div>
                        <div>Database Connection</div>
                        <div className="text-xs text-green-600">Connected</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Database Host</Label>
                        <Input defaultValue="db.example.com" onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Database Name</Label>
                        <Input defaultValue="medicheck_production" onChange={handleInputChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Database Username</Label>
                        <Input defaultValue="db_user" onChange={handleInputChange} />
                      </div>
                      <Button size="sm">Test Connection</Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="api">
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      <div>
                        <div>API Integrations</div>
                        <div className="text-xs text-gray-500">2 Active</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Enable API Access</Label>
                          <Switch defaultChecked onChange={handleInputChange} />
                        </div>
                        <p className="text-sm text-gray-500">Allow external services to access the API</p>
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="flex gap-2">
                          <Input defaultValue={process.env.NEXT_PUBLIC_STRIPE_API_KEY || "sk_test_placeholder"} readOnly />
                          <Button variant="outline" size="sm">
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage website content and legal pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Medical Disclaimer</Label>
                  <Textarea
                    className="min-h-[200px]"
                    defaultValue="The information provided by this tool is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website."
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-gray-500">This disclaimer appears on all medical information pages.</p>
                </div>

                <div className="space-y-2">
                  <Label>Privacy Policy URL</Label>
                  <Input defaultValue="/privacy" onChange={handleInputChange} />
                </div>

                <div className="space-y-2">
                  <Label>Terms of Service URL</Label>
                  <Input defaultValue="/terms" onChange={handleInputChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
