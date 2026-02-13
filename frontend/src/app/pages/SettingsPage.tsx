import { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../../lib/mockData';
import { useAuth } from '../../contexts/AuthContext';
import type { CompanySettings } from '../../lib/types';

export default function SettingsPage() {
  const { user } = useAuth();

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
  });

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    const settings = getStorageData<CompanySettings | null>(
      STORAGE_KEYS.COMPANY_SETTINGS,
      null
    );
    if (settings) {
      setCompanySettings(settings);
    }
  }, []);

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveCompanySettings = () => {
    if (companySettings) {
      setStorageData(STORAGE_KEYS.COMPANY_SETTINGS, companySettings);
      toast.success('Company settings updated successfully');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your account and company settings</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="company">Company Settings</TabsTrigger>
            <TabsTrigger value="budget">Budget Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Profile Information</h3>

              <div className="space-y-4 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={profileData.first_name}
                      onChange={e =>
                        setProfileData({ ...profileData, first_name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={profileData.last_name}
                      onChange={e =>
                        setProfileData({ ...profileData, last_name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profileData.email}
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input
                    type="tel"
                    value={profileData.phone_number}
                    onChange={e =>
                      setProfileData({ ...profileData, phone_number: e.target.value })
                    }
                  />
                </div>

                <Button
                  className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                  onClick={handleSaveProfile}
                >
                  Save Changes
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t">
                <h3 className="font-bold text-lg mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Current Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>

                  <div>
                    <Label>New Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>

                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => toast.info('Password change coming soon!')}
                  >
                    Update Password
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Company Settings Tab */}
          <TabsContent value="company">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Company Information</h3>

              {companySettings && (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={companySettings.company_name}
                      onChange={e =>
                        setCompanySettings({
                          ...companySettings,
                          company_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={companySettings.currency}
                      onValueChange={v =>
                        setCompanySettings({ ...companySettings, currency: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Financial Year Start Month</Label>
                    <Select
                      value={String(companySettings.financial_year_start)}
                      onValueChange={v =>
                        setCompanySettings({
                          ...companySettings,
                          financial_year_start: parseInt(v),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Default Working Days per Month</Label>
                    <Input
                      type="number"
                      value={companySettings.default_working_days}
                      onChange={e =>
                        setCompanySettings({
                          ...companySettings,
                          default_working_days: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <Button
                    className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                    onClick={handleSaveCompanySettings}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Budget Settings Tab */}
          <TabsContent value="budget">
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">Budget Configuration</h3>

              {companySettings && (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Total Budget</Label>
                    <Input
                      type="number"
                      value={companySettings.total_budget}
                      onChange={e =>
                        setCompanySettings({
                          ...companySettings,
                          total_budget: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total funds available for your organization
                    </p>
                  </div>

                  <div>
                    <Label>Monthly Budget Limit</Label>
                    <Input
                      type="number"
                      value={companySettings.monthly_budget_limit}
                      onChange={e =>
                        setCompanySettings({
                          ...companySettings,
                          monthly_budget_limit: parseFloat(e.target.value),
                        })
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum spending allowed per month
                    </p>
                  </div>

                  <Button
                    className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                    onClick={handleSaveCompanySettings}
                  >
                    Save Changes
                  </Button>

                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = '/budget'}
                    >
                      Manage Category Budgets
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
