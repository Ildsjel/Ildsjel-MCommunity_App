'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Divider,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Save,
} from '@mui/icons-material'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PrivacySettingsProps {
  discoverableByName: boolean
  discoverableByMusic: boolean
  cityVisible: string
  onUpdate: (settings: any) => void
}

export default function PrivacySettings({
  discoverableByName,
  discoverableByMusic,
  cityVisible,
  onUpdate,
}: PrivacySettingsProps) {
  const [settings, setSettings] = useState({
    discoverable_by_name: discoverableByName,
    discoverable_by_music: discoverableByMusic,
    city_visible: cityVisible,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setSuccess(false)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.patch(
        `${API_BASE}/api/v1/users/me/privacy`,
        settings,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      setSuccess(true)
      onUpdate(response.data)

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Failed to update privacy settings:', err)
      setError(err.response?.data?.detail || 'Failed to update privacy settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Visibility color="primary" />
          <Typography variant="h6">Privacy & Discoverability</Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Control how other users can find and view your profile
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Privacy settings updated successfully
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Discoverable by Name */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.discoverable_by_name}
                  onChange={(e) =>
                    setSettings({ ...settings, discoverable_by_name: e.target.checked })
                  }
                />
              }
              label="Discoverable by Name"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Allow others to find you by searching your username
            </Typography>
          </Box>

          <Divider />

          {/* Discoverable by Music */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.discoverable_by_music}
                  onChange={(e) =>
                    setSettings({ ...settings, discoverable_by_music: e.target.checked })
                  }
                />
              }
              label="Discoverable by Music Taste"
            />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
              Allow others to find you by searching for artists or genres you listen to
            </Typography>
          </Box>

          <Divider />

          {/* City Visibility */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Location Visibility</InputLabel>
              <Select
                value={settings.city_visible}
                label="Location Visibility"
                onChange={(e) =>
                  setSettings({ ...settings, city_visible: e.target.value })
                }
              >
                <MenuItem value="city">
                  <Box>
                    <Typography variant="body2">Show City</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Display your exact city (e.g., "Berlin")
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="region">
                  <Box>
                    <Typography variant="body2">Show Region Only</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Display only your country/region (e.g., "Germany")
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="hidden">
                  <Box>
                    <Typography variant="body2">Hidden</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Don't show your location
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Save Button */}
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{ mt: 2 }}
          >
            {saving ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

