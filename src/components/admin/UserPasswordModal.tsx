/**
 * Admin modal to create or reset a user's login password
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Text,
  VStack,
  Alert,
  AlertIcon,
  FormHelperText,
  Box,
} from '@/shared/design-system';
import { adminApi, User } from '@/services/admin';
import { getErrorMessage } from '@/services/api';

interface UserPasswordModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: {
    isCreate: boolean;
    emailSent?: boolean;
    hadGeneratedPassword: boolean;
  }) => void;
}

export const UserPasswordModal: React.FC<UserPasswordModalProps> = ({
  user,
  isOpen,
  onClose,
  onComplete,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const isCreate = user ? !user.hasPassword : false;
  const title = isCreate ? 'Create Password' : 'Reset Password';

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setConfirmPassword('');
    setSendEmail(true);
    setError(null);
    setGeneratedPassword(null);
  }, [isOpen, user?.id]);

  const handleSubmit = async () => {
    if (!user) return;

    const trimmed = password.trim();
    if (trimmed && trimmed.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (trimmed && trimmed !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeneratedPassword(null);

      const result = await adminApi.resetPassword(user.id, {
        newPassword: trimmed || undefined,
        sendEmail,
      });

      if (result.generatedPassword) {
        setGeneratedPassword(result.generatedPassword);
        return;
      }

      onComplete({
        isCreate,
        emailSent: result.emailSent,
        hadGeneratedPassword: false,
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to save password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {title} — {user?.name}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {error && (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            )}

            {generatedPassword ? (
              <Alert status="success">
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text>
                    Password {isCreate ? 'created' : 'reset'} successfully. Copy it now — it will
                    not be shown again.
                  </Text>
                  <Box
                    as="code"
                    display="block"
                    p={2}
                    bg="gray.100"
                    borderRadius="md"
                    fontFamily="mono"
                    fontSize="md"
                  >
                    {generatedPassword}
                  </Box>
                </VStack>
              </Alert>
            ) : (
              <>
                <Text fontSize="sm" color="gray.600">
                  {isCreate
                    ? 'This user has no email/password login yet (e.g. Google sign-in only). Set a password so they can sign in with email.'
                    : 'Set a new password for this user. Leave blank to auto-generate a secure password.'}
                </Text>

                <FormControl>
                  <FormLabel>New password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    autoComplete="new-password"
                  />
                  <FormHelperText>Minimum 6 characters when entered manually</FormHelperText>
                </FormControl>

                {password.trim() && (
                  <FormControl>
                    <FormLabel>Confirm password</FormLabel>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </FormControl>
                )}

                <Checkbox
                  isChecked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                >
                  Email credentials to {user?.email}
                </Checkbox>
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter flexWrap="wrap">
          {generatedPassword ? (
            <Button
              colorScheme="blue"
              onClick={() => {
                onComplete({ isCreate, hadGeneratedPassword: true });
                onClose();
              }}
              w={{ base: '100%', sm: 'auto' }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                mr={3}
                onClick={onClose}
                w={{ base: '100%', sm: 'auto' }}
                mb={{ base: 2, sm: 0 }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSubmit}
                isLoading={loading}
                w={{ base: '100%', sm: 'auto' }}
              >
                {isCreate ? 'Create Password' : 'Reset Password'}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
