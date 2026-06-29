/**
 * Admin — configure UPI ID, phone number, QR code for plan upgrades.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, FormControl, FormLabel, Heading, Image, Input,
  Spinner, Switch, Text, Textarea, VStack, useToast,
} from '@/shared/design-system';
import { paymentAdminApi } from '@/services/payment';
import type { PaymentSettings } from '@/types/payment';

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  const base = import.meta.env.DEV
    ? `http://${window.location.hostname}:3001`
    : window.location.origin;
  return `${base}${url}`;
}

export function PaymentSettingsPage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings & { qrImageUrl?: string | null }>({
    enabled: false, upiId: '', phoneNumber: '', payeeName: '', qrImageUrl: null, instructions: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentAdminApi.getSettings();
      setSettings(res.settings);
    } catch (err) {
      toast({ title: 'Failed to load', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await paymentAdminApi.updateSettings({
        enabled: settings.enabled,
        upiId: settings.upiId,
        phoneNumber: settings.phoneNumber,
        payeeName: settings.payeeName,
        instructions: settings.instructions,
      });
      setSettings(res.settings);
      toast({ title: 'Payment settings saved', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await paymentAdminApi.uploadQr(file);
      setSettings(res.settings);
      toast({ title: 'QR code uploaded', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Upload failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading payment settings…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxW="640px">
      <Box>
        <Heading size="lg">Payment Settings</Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          Configure UPI / bank payment details shown when students upgrade their plan.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Students pay via UPI, then upload a screenshot. You approve requests under Payment Requests to activate their plan.
      </Alert>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0}>Enable online payments</FormLabel>
        <Switch
          isChecked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Payee name</FormLabel>
        <Input
          value={settings.payeeName}
          onChange={(e) => setSettings((s) => ({ ...s, payeeName: e.target.value }))}
          placeholder="e.g. Greenwood Academy"
        />
      </FormControl>

      <FormControl>
        <FormLabel>UPI ID</FormLabel>
        <Input
          value={settings.upiId}
          onChange={(e) => setSettings((s) => ({ ...s, upiId: e.target.value }))}
          placeholder="name@upi"
        />
      </FormControl>

      <FormControl>
        <FormLabel>WhatsApp / phone number (for screenshot)</FormLabel>
        <Input
          value={settings.phoneNumber}
          onChange={(e) => setSettings((s) => ({ ...s, phoneNumber: e.target.value }))}
          placeholder="+91 98765 43210"
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          Shown to students so they can also send payment proof to this number.
        </Text>
      </FormControl>

      <FormControl>
        <FormLabel>Payment instructions</FormLabel>
        <Textarea
          value={settings.instructions}
          onChange={(e) => setSettings((s) => ({ ...s, instructions: e.target.value }))}
          rows={4}
          placeholder="Pay the plan amount via UPI, then upload your screenshot below…"
        />
      </FormControl>

      <FormControl>
        <FormLabel>UPI QR code (optional)</FormLabel>
        {settings.qrImageUrl && (
          <Image
            src={resolveImageUrl(settings.qrImageUrl)}
            alt="UPI QR"
            maxW="200px"
            mb={3}
            borderRadius="md"
            borderWidth={1}
          />
        )}
        <Input ref={fileRef} type="file" accept="image/*" onChange={handleQrUpload} p={1} />
        {uploading && <Spinner size="sm" mt={2} />}
      </FormControl>

      <Button colorScheme="purple" onClick={handleSave} isLoading={saving}>
        Save settings
      </Button>
    </VStack>
  );
}
