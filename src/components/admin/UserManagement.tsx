/**
 * User Management Component
 * Manage users, approve/reject, assign roles, and view analytics
 */

import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Input,
  Button,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  Text,
  useToast,
  Switch,
  useBreakpointValue,
  Card,
  CardBody,
  Divider,
} from '@/shared/design-system';
import { adminApi, User, Role } from '@/services/admin';
import { apiClient } from '@/services/api';

/**
 * User Management component
 */
interface Plan {
  id: string;
  name: string;
  description: string | null;
  daily_quiz_limit: number;
  daily_topic_limit: number;
  monthly_cost: number;
  status: 'active' | 'inactive';
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userPlans, setUserPlans] = useState<Record<string, string>>({}); // userId -> planId
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBulkRolesOpen, onOpen: onBulkRolesOpen, onClose: onBulkRolesClose } = useDisclosure();
  const { isOpen: isBulkPlansOpen, onOpen: onBulkPlansOpen, onClose: onBulkPlansClose } = useDisclosure();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [bulkSelectedRoles, setBulkSelectedRoles] = useState<string[]>([]);
  const [bulkSelectedPlan, setBulkSelectedPlan] = useState<string>('');
  const [assigningPlan, setAssigningPlan] = useState<string | null>(null); // userId being assigned
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    name: '',
    age: '',
    ageGroup: '',
    grade: '',
    parentContact: '',
    status: 'approved' as 'approved' | 'pending',
    moduleAccess: ['study', 'quiz'] as string[],
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    age: '',
    ageGroup: '',
    grade: '',
    parentContact: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadPlans();
  }, [filters]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers({
        status: filters.status || undefined,
        search: filters.search || undefined,
        page: filters.page,
        limit: 20,
      });
      setUsers(data.users);
      
      // Load plan info for each user
      const planMap: Record<string, string> = {};
      await Promise.all(
        data.users.map(async (user) => {
          try {
            const response = await apiClient.get<{ success: boolean; plan: Plan | null }>(`/plans/user/${user.id}`);
            if (response.data.success && response.data.plan) {
              planMap[user.id] = response.data.plan.id;
            }
          } catch (err) {
            // User might not have a plan assigned, that's okay
            console.debug(`No plan found for user ${user.id}`);
          }
        })
      );
      setUserPlans(planMap);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await adminApi.getRoles();
      setRoles(data.roles);
    } catch (err) {
      console.error('Failed to load roles', err);
    }
  };

  const loadPlans = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; plans: Plan[] }>('/plans');
      setPlans(response.data.plans.filter((p) => p.status === 'active'));
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  const handleApprove = async (userId: string, status: 'approved' | 'rejected') => {
    try {
      // When approving, grant access to both modules by default
      // When rejecting, moduleAccess can be empty array (will revoke access)
      await adminApi.approveUser(userId, status, status === 'approved' ? ['study', 'quiz'] : []);
      loadUsers();
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  /**
   * Toggle user enabled/disabled status
   * Enabled = 'approved', Disabled = 'suspended'
   */
  const handleToggleUserStatus = async (user: User, isEnabled: boolean) => {
    try {
      if (isEnabled) {
        // Enable user: set to approved and grant module access
        await adminApi.approveUser(user.id, 'approved', ['study', 'quiz']);
        toast({
          title: 'User Enabled',
          description: `${user.name} has been enabled`,
          status: 'success',
          duration: 2000,
        });
      } else {
        // Disable user: suspend
        await adminApi.suspendUser(user.id);
        toast({
          title: 'User Disabled',
          description: `${user.name} has been disabled`,
          status: 'success',
          duration: 2000,
        });
      }
      loadUsers();
    } catch (err) {
      toast({
        title: 'Error',
        description: `Failed to ${isEnabled ? 'enable' : 'disable'} user`,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    try {
      const roleIds = roles
        .filter((r) => selectedRoles.includes(r.id))
        .map((r) => r.id);
      await adminApi.assignRoles(selectedUser.id, roleIds);
      onClose();
      loadUsers();
    } catch (err) {
      setError('Failed to assign roles');
    }
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    const userRoleIds = roles
      .filter((r) => user.roles?.some((ur) => ur.name === r.name))
      .map((r) => r.id);
    setSelectedRoles(userRoleIds);
    onOpen();
  };

  const handleCreateUser = async () => {
    try {
      setCreateLoading(true);
      setError(null);

      const roleIds = roles
        .filter((r) => selectedRoles.includes(r.id))
        .map((r) => r.id);

      await adminApi.createUser({
        email: createFormData.email,
        name: createFormData.name,
        age: createFormData.age ? parseInt(createFormData.age) : undefined,
        ageGroup: createFormData.ageGroup || undefined,
        grade: createFormData.grade || undefined,
        parentContact: createFormData.parentContact || undefined,
        roles: roleIds.length > 0 ? roleIds : undefined,
        moduleAccess: createFormData.moduleAccess,
        status: createFormData.status,
      });

      toast({
        title: 'Success',
        description: 'User created successfully. Welcome email with password has been sent.',
        status: 'success',
        duration: 3000,
      });

      onCreateClose();
      setCreateFormData({
        email: '',
        name: '',
        age: '',
        ageGroup: '',
        grade: '',
        parentContact: '',
        status: 'approved',
        moduleAccess: ['study', 'quiz'],
      });
      setSelectedRoles([]);
      loadUsers();
    } catch (err: unknown) {
      setError('Failed to create user');
      toast({
        title: 'Error',
        description: 'Failed to create user. Please try again.',
        status: 'error',
        duration: 3000,
      });
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  /**
   * Open edit modal with user data
   */
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      age: user.age?.toString() || '',
      ageGroup: user.ageGroup || '',
      grade: user.grade || '',
      parentContact: user.parentContact || '',
    });
    onEditOpen();
  };

  /**
   * Handle edit user submission
   */
  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setEditLoading(true);
      setError(null);

      await adminApi.updateUser(selectedUser.id, {
        name: editFormData.name,
        age: editFormData.age ? parseInt(editFormData.age) : undefined,
        ageGroup: editFormData.ageGroup || undefined,
        grade: editFormData.grade || undefined,
        parentContact: editFormData.parentContact || undefined,
      });

      toast({
        title: 'Success',
        description: 'User updated successfully',
        status: 'success',
        duration: 2000,
      });

      onEditClose();
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        status: 'error',
        duration: 3000,
      });
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * Open delete confirmation modal
   */
  const handleOpenDelete = (user: User) => {
    setUserToDelete(user);
    onDeleteOpen();
  };

  /**
   * Handle delete user
   */
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleteLoading(true);
      setError(null);

      await adminApi.deleteUser(userToDelete.id);

      toast({
        title: 'Success',
        description: `User ${userToDelete.name} deleted successfully`,
        status: 'success',
        duration: 2000,
      });

      onDeleteClose();
      setUserToDelete(null);
      loadUsers();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        status: 'error',
        duration: 3000,
      });
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkAssignRoles = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select at least one user',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (bulkSelectedRoles.length === 0) {
      toast({
        title: 'No Roles Selected',
        description: 'Please select at least one role',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setBulkLoading(true);
      const roleIds = roles
        .filter((r) => bulkSelectedRoles.includes(r.id))
        .map((r) => r.id);

      const promises = Array.from(selectedUserIds).map((userId) =>
        adminApi.assignRoles(userId, roleIds).catch((err) => {
          console.error(`Failed to assign roles to user ${userId}:`, err);
          return { userId, error: err };
        })
      );

      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed === 0) {
        toast({
          title: 'Success',
          description: `Roles assigned to ${selectedUserIds.size} user(s) successfully`,
          status: 'success',
          duration: 3000,
        });
        setSelectedUserIds(new Set());
        setBulkSelectedRoles([]);
        onBulkRolesClose();
        loadUsers();
      } else {
        toast({
          title: 'Partial Success',
          description: `Roles assigned to ${selectedUserIds.size - failed} user(s). ${failed} failed.`,
          status: 'warning',
          duration: 5000,
        });
        loadUsers();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to assign roles',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleInlinePlanAssign = async (userId: string, planId: string) => {
    if (!planId) return;
    
    try {
      setAssigningPlan(userId);
      await apiClient.post(`/plans/${planId}/assign/${userId}`);
      setUserPlans((prev) => ({ ...prev, [userId]: planId }));
      toast({
        title: 'Success',
        description: 'Plan assigned successfully',
        status: 'success',
        duration: 2000,
      });
      loadUsers();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to assign plan',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setAssigningPlan(null);
    }
  };

  const handleBulkAssignPlan = async () => {
    if (selectedUserIds.size === 0) {
      toast({
        title: 'No Users Selected',
        description: 'Please select at least one user',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!bulkSelectedPlan) {
      toast({
        title: 'No Plan Selected',
        description: 'Please select a plan',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setBulkLoading(true);
      const promises = Array.from(selectedUserIds).map((userId) =>
        apiClient.post(`/plans/${bulkSelectedPlan}/assign/${userId}`).catch((err) => {
          console.error(`Failed to assign plan to user ${userId}:`, err);
          return { userId, error: err };
        })
      );

      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed === 0) {
        toast({
          title: 'Success',
          description: `Plan assigned to ${selectedUserIds.size} user(s) successfully`,
          status: 'success',
          duration: 3000,
        });
        setSelectedUserIds(new Set());
        setBulkSelectedPlan('');
        onBulkPlansClose();
        loadUsers();
      } else {
        toast({
          title: 'Partial Success',
          description: `Plan assigned to ${selectedUserIds.size - failed} user(s). ${failed} failed.`,
          status: 'warning',
          duration: 5000,
        });
        loadUsers();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to assign plan',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const isUserEnabled = (status: string) => status === 'approved' || status === 'enabled';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'enabled':
        return 'green';
      case 'pending':
        return 'orange';
      case 'rejected':
        return 'red';
      case 'suspended':
        return 'gray';
      default:
        return 'gray';
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={{ base: 4, md: 6 }}>
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        <HStack justify="space-between" flexWrap="wrap" spacing={{ base: 2, md: 4 }}>
          <Heading size={{ base: 'md', md: 'lg' }}>User Management</Heading>
          <HStack spacing={2} flexWrap="wrap" w={{ base: '100%', sm: 'auto' }}>
            <Button
              colorScheme="purple"
              onClick={onBulkRolesOpen}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: 'auto' }}
              isDisabled={selectedUserIds.size === 0}
            >
              Assign Roles {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
            </Button>
            <Button
              colorScheme="teal"
              onClick={onBulkPlansOpen}
              size={{ base: 'sm', md: 'md' }}
              w={{ base: '100%', sm: 'auto' }}
              isDisabled={selectedUserIds.size === 0}
            >
              Assign Plan {selectedUserIds.size > 0 && `(${selectedUserIds.size})`}
            </Button>
            {selectedUserIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => setSelectedUserIds(new Set())}
                size={{ base: 'sm', md: 'md' }}
                w={{ base: '100%', sm: 'auto' }}
              >
                Clear Selection
              </Button>
            )}
            <Button colorScheme="blue" onClick={onCreateOpen} size={{ base: 'sm', md: 'md' }} w={{ base: '100%', sm: 'auto' }}>
              + Create User
            </Button>
          </HStack>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <HStack spacing={4} flexWrap="wrap" w="100%">
          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            maxWidth={{ base: '100%', sm: '300px' }}
            flex={1}
            minW={{ base: '100%', sm: '200px' }}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            maxWidth={{ base: '100%', sm: '200px' }}
            w={{ base: '100%', sm: 'auto' }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </Select>
        </HStack>

        {/* Desktop Table View */}
        {!isMobile && (
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={selectedUserIds.size === users.length && users.length > 0}
                      isIndeterminate={selectedUserIds.size > 0 && selectedUserIds.size < users.length}
                      onChange={handleSelectAll}
                    />
                  </Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Enabled</Th>
                  <Th>Roles</Th>
                  <Th>Plan</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {users.map((user) => {
                  const isEnabled = isUserEnabled(user.status);
                  return (
                    <Tr key={user.id}>
                      <Td>
                        <Checkbox
                          isChecked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                      </Td>
                      <Td>{user.name}</Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(user.status)}>{user.status}</Badge>
                      </Td>
                      <Td>
                        <Switch
                          isChecked={isEnabled}
                          onChange={(e) => handleToggleUserStatus(user, e.target.checked)}
                          colorScheme="green"
                          size="md"
                        />
                      </Td>
                      <Td>
                        {user.roles?.map((r) => (
                          <Badge key={r.name} mr={1} colorScheme="blue">
                            {r.name}
                          </Badge>
                        ))}
                      </Td>
                      <Td>
                        <Select
                          value={userPlans[user.id] || ''}
                          onChange={(e) => handleInlinePlanAssign(user.id, e.target.value)}
                          size="sm"
                          placeholder="Select plan"
                          isDisabled={assigningPlan === user.id}
                          minW="150px"
                        >
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
                          ))}
                        </Select>
                      </Td>
                      <Td>{new Date(user.createdAt).toLocaleDateString()}</Td>
                      <Td>
                        <Menu>
                          <MenuButton as={Button} size="sm" variant="ghost">
                            Actions
                          </MenuButton>
                          <MenuList>
                            <MenuItem onClick={() => handleOpenEdit(user)}>Edit User</MenuItem>
                            {user.status === 'pending' && (
                              <>
                                <MenuItem onClick={() => handleApprove(user.id, 'approved')}>
                                  Approve
                                </MenuItem>
                                <MenuItem onClick={() => handleApprove(user.id, 'rejected')}>
                                  Reject
                                </MenuItem>
                              </>
                            )}
                            <MenuItem onClick={() => openRoleModal(user)}>Assign Roles</MenuItem>
                            {user.status === 'suspended' && (
                              <MenuItem onClick={() => handleToggleUserStatus(user, true)}>
                                Enable User
                              </MenuItem>
                            )}
                            {isUserEnabled(user.status) && (
                              <MenuItem onClick={() => handleToggleUserStatus(user, false)}>
                                Disable User
                              </MenuItem>
                            )}
                            <MenuItem onClick={() => handleOpenDelete(user)} color="red.500">
                              Delete User
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}

        {/* Mobile Card View */}
        {isMobile && (
          <VStack spacing={4} align="stretch">
            {users.length === 0 && !loading && (
              <Text textAlign="center" color="gray.500" py={8}>
                No users found
              </Text>
            )}
            {users.map((user) => {
              const isEnabled = isUserEnabled(user.status);
              return (
                <Card key={user.id}>
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Checkbox
                          isChecked={selectedUserIds.has(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                        />
                        <Menu>
                          <MenuButton as={Button} size="sm" variant="ghost">
                            ⋮
                          </MenuButton>
                          <MenuList>
                            <MenuItem onClick={() => handleOpenEdit(user)}>Edit User</MenuItem>
                            {user.status === 'pending' && (
                              <>
                                <MenuItem onClick={() => handleApprove(user.id, 'approved')}>
                                  Approve
                                </MenuItem>
                                <MenuItem onClick={() => handleApprove(user.id, 'rejected')}>
                                  Reject
                                </MenuItem>
                              </>
                            )}
                            <MenuItem onClick={() => openRoleModal(user)}>Assign Roles</MenuItem>
                            {user.status === 'suspended' && (
                              <MenuItem onClick={() => handleToggleUserStatus(user, true)}>
                                Enable User
                              </MenuItem>
                            )}
                            {isUserEnabled(user.status) && (
                              <MenuItem onClick={() => handleToggleUserStatus(user, false)}>
                                Disable User
                              </MenuItem>
                            )}
                            <MenuItem onClick={() => handleOpenDelete(user)} color="red.500">
                              Delete User
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                      <Divider />
                      <VStack align="stretch" spacing={2}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" fontSize="md">
                            {user.name}
                          </Text>
                          <Badge colorScheme={getStatusColor(user.status)}>{user.status}</Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          {user.email}
                        </Text>
                        <HStack justify="space-between" flexWrap="wrap">
                          <Text fontSize="sm" color="gray.600">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </Text>
                          <HStack>
                            <Text fontSize="sm" color="gray.600">
                              Enabled:
                            </Text>
                            <Switch
                              isChecked={isEnabled}
                              onChange={(e) => handleToggleUserStatus(user, e.target.checked)}
                              colorScheme="green"
                              size="sm"
                            />
                          </HStack>
                        </HStack>
                        {user.roles && user.roles.length > 0 && (
                          <HStack flexWrap="wrap" spacing={1}>
                            <Text fontSize="sm" color="gray.600" mr={2}>
                              Roles:
                            </Text>
                            {user.roles.map((r) => (
                              <Badge key={r.name} colorScheme="blue" fontSize="xs">
                                {r.name}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                        <FormControl>
                          <FormLabel fontSize="sm">Plan</FormLabel>
                          <Select
                            value={userPlans[user.id] || ''}
                            onChange={(e) => handleInlinePlanAssign(user.id, e.target.value)}
                            size="sm"
                            placeholder="Select plan"
                            isDisabled={assigningPlan === user.id}
                          >
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      </VStack>
                    </VStack>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        )}

        <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Assign Roles to {selectedUser?.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <CheckboxGroup value={selectedRoles} onChange={(vals) => setSelectedRoles(vals as string[])}>
                <VStack align="start" spacing={2}>
                  {roles.map((role) => (
                    <Checkbox key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </Checkbox>
                  ))}
                </VStack>
              </CheckboxGroup>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button variant="ghost" mr={3} onClick={onClose} w={{ base: '100%', sm: 'auto' }} mb={{ base: 2, sm: 0 }}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleAssignRoles} w={{ base: '100%', sm: 'auto' }}>
                Save
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Create User Modal */}
        <Modal isOpen={isCreateOpen} onClose={onCreateClose} size={{ base: 'full', md: 'lg' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={createFormData.email}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, email: e.target.value })
                    }
                  />
                </FormControl>

                <Alert status="info">
                  <AlertIcon />
                  <Text fontSize="sm">
                    A secure password will be auto-generated and sent to the user's email address.
                  </Text>
                </Alert>

                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={createFormData.name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, name: e.target.value })
                    }
                  />
                </FormControl>

                <HStack flexWrap="wrap" spacing={4} w="100%">
                  <FormControl flex={1} minW={{ base: '100%', sm: '150px' }}>
                    <FormLabel>Age</FormLabel>
                    <Input
                      type="number"
                      value={createFormData.age}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, age: e.target.value })
                      }
                    />
                  </FormControl>

                  <FormControl flex={1} minW={{ base: '100%', sm: '150px' }}>
                    <FormLabel>Age Group</FormLabel>
                    <Select
                      value={createFormData.ageGroup}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, ageGroup: e.target.value })
                      }
                    >
                      <option value="">Select</option>
                      <option value="6-8">6-8 years</option>
                      <option value="9-11">9-11 years</option>
                      <option value="12-14">12-14 years</option>
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel>Grade</FormLabel>
                  <Input
                    value={createFormData.grade}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, grade: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Parent Contact</FormLabel>
                  <Input
                    value={createFormData.parentContact}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, parentContact: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={createFormData.status}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        status: e.target.value as 'approved' | 'pending',
                      })
                    }
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Assign Roles</FormLabel>
                  <CheckboxGroup
                    value={selectedRoles}
                    onChange={(vals) => setSelectedRoles(vals as string[])}
                  >
                    <VStack align="start" spacing={2}>
                      {roles.map((role) => (
                        <Checkbox key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </Checkbox>
                      ))}
                    </VStack>
                  </CheckboxGroup>
                  <Text fontSize="sm" color="gray.500" mt={2}>
                    If no roles selected, user will be assigned "student" role by default
                  </Text>
                </FormControl>

                <FormControl>
                  <FormLabel>Module Access</FormLabel>
                  <CheckboxGroup
                    value={createFormData.moduleAccess}
                    onChange={(vals) =>
                      setCreateFormData({ ...createFormData, moduleAccess: vals as string[] })
                    }
                  >
                    <HStack spacing={4}>
                      <Checkbox value="study">Study Module</Checkbox>
                      <Checkbox value="quiz">Quiz Module</Checkbox>
                    </HStack>
                  </CheckboxGroup>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button variant="ghost" mr={3} onClick={onCreateClose} w={{ base: '100%', sm: 'auto' }} mb={{ base: 2, sm: 0 }}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleCreateUser} isLoading={createLoading} w={{ base: '100%', sm: 'auto' }}>
                Create User
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit User Modal */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} size={{ base: 'full', md: 'lg' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Edit User - {selectedUser?.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                  />
                </FormControl>

                <HStack flexWrap="wrap" spacing={4} w="100%">
                  <FormControl flex={1} minW={{ base: '100%', sm: '150px' }}>
                    <FormLabel>Age</FormLabel>
                    <Input
                      type="number"
                      value={editFormData.age}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, age: e.target.value })
                      }
                    />
                  </FormControl>

                  <FormControl flex={1} minW={{ base: '100%', sm: '150px' }}>
                    <FormLabel>Age Group</FormLabel>
                    <Select
                      value={editFormData.ageGroup}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, ageGroup: e.target.value })
                      }
                    >
                      <option value="">Select</option>
                      <option value="6-8">6-8 years</option>
                      <option value="9-11">9-11 years</option>
                      <option value="12-14">12-14 years</option>
                    </Select>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormLabel>Grade</FormLabel>
                  <Input
                    value={editFormData.grade}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, grade: e.target.value })
                    }
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Parent Contact</FormLabel>
                  <Input
                    value={editFormData.parentContact}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, parentContact: e.target.value })
                    }
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button variant="ghost" mr={3} onClick={onEditClose} w={{ base: '100%', sm: 'auto' }} mb={{ base: 2, sm: 0 }}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleEditUser} isLoading={editLoading} w={{ base: '100%', sm: 'auto' }}>
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete User Confirmation Modal */}
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size={{ base: 'full', md: 'md' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Delete User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="warning">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
                  </Text>
                </Alert>
                <Text fontSize="sm" color="gray.600">
                  This action cannot be undone. All user data, including roles, plan assignments, and quiz history will be permanently deleted.
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button variant="ghost" mr={3} onClick={onDeleteClose} w={{ base: '100%', sm: 'auto' }} mb={{ base: 2, sm: 0 }}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteUser}
                isLoading={deleteLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                Delete User
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Bulk Assign Roles Modal */}
        <Modal isOpen={isBulkRolesOpen} onClose={onBulkRolesClose} size={{ base: 'full', md: 'md' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Bulk Assign Roles ({selectedUserIds.size} users)</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Selected {selectedUserIds.size} user(s). The selected roles will be assigned to all of them.
                  </Text>
                </Alert>
                <FormControl>
                  <FormLabel>Select Roles</FormLabel>
                  <CheckboxGroup value={bulkSelectedRoles} onChange={(vals) => setBulkSelectedRoles(vals as string[])}>
                    <VStack align="start" spacing={2}>
                      {roles.map((role) => (
                        <Checkbox key={role.id} value={role.id}>
                          {role.name} - {role.description}
                        </Checkbox>
                      ))}
                    </VStack>
                  </CheckboxGroup>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter flexWrap="wrap">
              <Button
                variant="ghost"
                mr={3}
                onClick={onBulkRolesClose}
                w={{ base: '100%', sm: 'auto' }}
                mb={{ base: 2, sm: 0 }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleBulkAssignRoles}
                isLoading={bulkLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                Assign Roles
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Bulk Assign Plan Modal */}
        <Modal isOpen={isBulkPlansOpen} onClose={onBulkPlansClose} size={{ base: 'full', md: 'md' }}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Bulk Assign Plan ({selectedUserIds.size} users)</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Selected {selectedUserIds.size} user(s). The selected plan will be assigned to all of them.
                  </Text>
                </Alert>
                <FormControl isRequired>
                  <FormLabel>Select Plan</FormLabel>
                  <Select
                    value={bulkSelectedPlan}
                    onChange={(e) => setBulkSelectedPlan(e.target.value)}
                    placeholder="Choose a plan"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {plan.daily_quiz_limit} quizzes, {plan.daily_topic_limit} topics/day
                        {typeof plan.monthly_cost === 'number' && plan.monthly_cost > 0
                          ? ` - $${plan.monthly_cost.toFixed(2)}/month`
                          : ' - Free'}
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
                onClick={onBulkPlansClose}
                w={{ base: '100%', sm: 'auto' }}
                mb={{ base: 2, sm: 0 }}
              >
                Cancel
              </Button>
              <Button
                colorScheme="teal"
                onClick={handleBulkAssignPlan}
                isLoading={bulkLoading}
                w={{ base: '100%', sm: 'auto' }}
              >
                Assign Plan
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
    </Box>
  );
};

