/**
 * Plan Management Component
 * Manage user plans, create/edit plans, and assign plans to users
 */

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  useToast,
  Switch,
  FormHelperText,
} from '@/shared/design-system';
import { apiClient } from '@/services/api';
import { formatPlanPrice } from '@/utils/planPricing';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  daily_quiz_limit: number;
  daily_topic_limit: number;
  monthly_cost: number;
  status: 'active' | 'inactive';
  hide_ai_study?: boolean;
  hide_ai_quiz?: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

interface PlanFormData {
  name: string;
  description: string;
  dailyQuizLimit: number;
  dailyTopicLimit: number;
  monthlyCost: number;
  status: 'active' | 'inactive';
  hideAiStudy: boolean;
  hideAiQuiz: boolean;
}

/**
 * Plan Management component
 */
export const PlanManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    dailyQuizLimit: 1,
    dailyTopicLimit: 1,
    monthlyCost: 0,
    status: 'active',
    hideAiStudy: false,
    hideAiQuiz: false,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; plans: Plan[] }>('/plans');
      // Normalize monthly_cost to ensure it's always a number
      const normalizedPlans = response.data.plans.map((plan) => ({
        ...plan,
        monthly_cost: typeof plan.monthly_cost === 'number' ? plan.monthly_cost : Number(plan.monthly_cost || 0),
      }));
      setPlans(normalizedPlans);
    } catch (err) {
      setError('Failed to load plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedPlan(null);
    setFormData({
      name: '',
      description: '',
      dailyQuizLimit: 1,
      dailyTopicLimit: 1,
      monthlyCost: 0,
      status: 'active',
      hideAiStudy: false,
      hideAiQuiz: false,
    });
    onOpen();
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      dailyQuizLimit: plan.daily_quiz_limit,
      dailyTopicLimit: plan.daily_topic_limit,
      monthlyCost: typeof plan.monthly_cost === 'number' ? plan.monthly_cost : Number(plan.monthly_cost || 0),
      status: plan.status,
      hideAiStudy: Boolean(plan.hide_ai_study),
      hideAiQuiz: Boolean(plan.hide_ai_quiz),
    });
    onOpen();
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.dailyQuizLimit < 0 || formData.dailyTopicLimit < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setFormLoading(true);
      if (selectedPlan) {
        // Update existing plan
        await apiClient.put(`/plans/${selectedPlan.id}`, formData);
        toast({
          title: 'Success',
          description: 'Plan updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        // Create new plan
        await apiClient.post('/plans', formData);
        toast({
          title: 'Success',
          description: 'Plan created successfully',
          status: 'success',
          duration: 3000,
        });
      }
      onClose();
      loadPlans();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save plan';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Are you sure you want to ${plan.status === 'active' ? 'deactivate' : 'delete'} this plan?`)) {
      return;
    }

    try {
      await apiClient.delete(`/plans/${plan.id}`);
      toast({
        title: 'Success',
        description: 'Plan deleted successfully',
        status: 'success',
        duration: 3000,
      });
      loadPlans();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete plan';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleAssignPlan = () => {
    onAssignOpen();
  };

  const handleAssignSubmit = async () => {
    if (!assignUserId || !assignPlanId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both user and plan',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setFormLoading(true);
      await apiClient.post(`/plans/${assignPlanId}/assign/${assignUserId}`);
      toast({
        title: 'Success',
        description: 'Plan assigned successfully',
        status: 'success',
        duration: 3000,
      });
      onAssignClose();
      setAssignUserId('');
      setAssignPlanId('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign plan';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" padding={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box padding={{ base: 4, md: 6 }}>
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        <HStack justifyContent="space-between" flexWrap="wrap" spacing={{ base: 2, md: 4 }}>
          <Heading size={{ base: 'md', md: 'lg' }}>Plan Management</Heading>
          <HStack spacing={2} flexWrap="wrap" w={{ base: '100%', sm: 'auto' }}>
            <Button
              colorScheme="blue"
              onClick={handleAssignPlan}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: 'auto' }}
            >
              Assign Plan to User
            </Button>
            <Button
              colorScheme="green"
              onClick={handleCreate}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: 'auto' }}
            >
              Create New Plan
            </Button>
          </HStack>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th>Daily Quiz Limit</Th>
                <Th>Daily Topic Limit</Th>
                <Th>Monthly Cost</Th>
                <Th>Status</Th>
                <Th>Users</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {plans.map((plan) => (
                <Tr key={plan.id}>
                  <Td fontWeight="bold">
                    {plan.name}
                    {(plan.hide_ai_study || plan.hide_ai_quiz) && (
                      <HStack spacing={1} mt={1} flexWrap="wrap">
                        {plan.hide_ai_study && (
                          <Badge colorScheme="orange" fontSize="xs">No AI Study</Badge>
                        )}
                        {plan.hide_ai_quiz && (
                          <Badge colorScheme="orange" fontSize="xs">No AI Quiz</Badge>
                        )}
                      </HStack>
                    )}
                  </Td>
                  <Td>{plan.description || '-'}</Td>
                  <Td>{plan.daily_quiz_limit}</Td>
                  <Td>{plan.daily_topic_limit}</Td>
                  <Td>{formatPlanPrice(plan.monthly_cost)}</Td>
                  <Td>
                    <Badge colorScheme={plan.status === 'active' ? 'green' : 'gray'}>
                      {plan.status}
                    </Badge>
                  </Td>
                  <Td>{plan.user_count || 0}</Td>
                  <Td>
                    <HStack spacing={2} flexWrap="wrap">
                      <Button size={{ base: 'xs', md: 'sm' }} onClick={() => handleEdit(plan)}>
                        Edit
                      </Button>
                      <Button
                        size={{ base: 'xs', md: 'sm' }}
                        colorScheme="red"
                        variant="outline"
                        onClick={() => handleDelete(plan)}
                      >
                        <Text display={{ base: 'none', sm: 'block' }}>
                          {plan.status === 'active' ? 'Deactivate' : 'Delete'}
                        </Text>
                        <Text display={{ base: 'block', sm: 'none' }}>
                          {plan.status === 'active' ? 'Deact' : 'Del'}
                        </Text>
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Create/Edit Plan Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'lg' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{selectedPlan ? 'Edit Plan' : 'Create New Plan'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={{ base: 3, md: 4 }}>
                <FormControl isRequired>
                  <FormLabel>Plan Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Premium, Basic"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Plan description"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Daily Quiz Limit</FormLabel>
                  <NumberInput
                    value={formData.dailyQuizLimit}
                    onChange={(_: string, value: number) =>
                      setFormData({ ...formData, dailyQuizLimit: isNaN(value) ? 0 : value })
                    }
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Daily Topic Limit</FormLabel>
                  <NumberInput
                    value={formData.dailyTopicLimit}
                    onChange={(_: string, value: number) =>
                      setFormData({ ...formData, dailyTopicLimit: isNaN(value) ? 0 : value })
                    }
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Monthly Cost (₹)</FormLabel>
                  <NumberInput
                    value={formData.monthlyCost}
                    onChange={(_: string, value: number) =>
                      setFormData({ ...formData, monthlyCost: isNaN(value) ? 0 : value })
                    }
                    min={0}
                    precision={2}
                    step={0.01}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'active' | 'inactive',
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="hide-ai-study"
                    isChecked={formData.hideAiStudy}
                    onChange={(e) => setFormData({ ...formData, hideAiStudy: e.target.checked })}
                  />
                  <Box ml={3}>
                    <FormLabel htmlFor="hide-ai-study" mb={0}>Hide AI Study Mode</FormLabel>
                    <FormHelperText mt={0}>
                      Users on this plan keep Study Library and history; AI lesson generation is hidden.
                    </FormHelperText>
                  </Box>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="hide-ai-quiz"
                    isChecked={formData.hideAiQuiz}
                    onChange={(e) => setFormData({ ...formData, hideAiQuiz: e.target.checked })}
                  />
                  <Box ml={3}>
                    <FormLabel htmlFor="hide-ai-quiz" mb={0}>Hide AI Quiz Mode</FormLabel>
                    <FormHelperText mt={0}>
                      Users on this plan keep scheduled tests and quiz library; AI-generated quizzes are hidden.
                    </FormHelperText>
                  </Box>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
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
                isLoading={formLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                {selectedPlan ? 'Update' : 'Create'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Assign Plan Modal */}
        <Modal isOpen={isAssignOpen} onClose={onAssignClose} size={{ base: 'full', md: 'md' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Assign Plan to User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={{ base: 3, md: 4 }}>
                <FormControl isRequired>
                  <FormLabel>User ID</FormLabel>
                  <Input
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    placeholder="Enter user ID"
                  />
                  <Text fontSize="sm" color="gray.500" marginTop={1}>
                    You can find user IDs in the User Management section
                  </Text>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Plan</FormLabel>
                  <Select
                    value={assignPlanId}
                    onChange={(e) => setAssignPlanId(e.target.value)}
                    placeholder="Select a plan"
                  >
                    {plans
                      .filter((p) => p.status === 'active')
                      .map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({plan.daily_quiz_limit} quizzes, {plan.daily_topic_limit}{' '}
                          topics/day)
                        </option>
                      ))}
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button
                variant="ghost"
                mr={3}
                onClick={onAssignClose}
                w={{ base: '100%', sm: 'auto' }}
                mb={{ base: 2, sm: 0 }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleAssignSubmit}
                isLoading={formLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                Assign
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

