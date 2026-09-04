import {
  hasPermission,
  hasMinimumRole,
  canAccessResource,
  getRoleDisplayName,
  getRoleColor,
  isValidRoleTransition,
  getAvailableRoles,
  filterByPermission,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
} from '@/lib/permissions'
import type { UserRole } from '@/types'

describe('Permissions', () => {
  describe('hasPermission', () => {
    it('should grant OWNER all permissions', () => {
      expect(hasPermission('OWNER', 'account', 'manage')).toBe(true)
      expect(hasPermission('OWNER', 'billing', 'manage')).toBe(true)
      expect(hasPermission('OWNER', 'posts', 'delete')).toBe(true)
    })

    it('should grant EDITOR post permissions', () => {
      expect(hasPermission('EDITOR', 'posts', 'create')).toBe(true)
      expect(hasPermission('EDITOR', 'posts', 'read')).toBe(true)
      expect(hasPermission('EDITOR', 'posts', 'update')).toBe(true)
      expect(hasPermission('EDITOR', 'posts', 'publish')).toBe(true)
    })

    it('should deny EDITOR account management', () => {
      expect(hasPermission('EDITOR', 'account', 'manage')).toBe(false)
      expect(hasPermission('EDITOR', 'billing', 'manage')).toBe(false)
    })

    it('should grant VIEWER read permissions only', () => {
      expect(hasPermission('VIEWER', 'posts', 'read')).toBe(true)
      expect(hasPermission('VIEWER', 'posts', 'create')).toBe(false)
      expect(hasPermission('VIEWER', 'posts', 'delete')).toBe(false)
    })

    it('should grant ADMIN team management', () => {
      expect(hasPermission('ADMIN', 'team', 'invite')).toBe(true)
      expect(hasPermission('ADMIN', 'team', 'remove')).toBe(true)
    })

    it('should deny VIEWER analytics export', () => {
      expect(hasPermission('VIEWER', 'analytics', 'export')).toBe(false)
    })

    it('should grant ADMIN analytics export', () => {
      expect(hasPermission('ADMIN', 'analytics', 'export')).toBe(true)
    })
  })

  describe('hasMinimumRole', () => {
    it('OWNER has minimum role of all', () => {
      expect(hasMinimumRole('OWNER', 'OWNER')).toBe(true)
      expect(hasMinimumRole('OWNER', 'ADMIN')).toBe(true)
      expect(hasMinimumRole('OWNER', 'EDITOR')).toBe(true)
      expect(hasMinimumRole('OWNER', 'VIEWER')).toBe(true)
    })

    it('ADMIN has minimum role of ADMIN and below', () => {
      expect(hasMinimumRole('ADMIN', 'OWNER')).toBe(false)
      expect(hasMinimumRole('ADMIN', 'ADMIN')).toBe(true)
      expect(hasMinimumRole('ADMIN', 'EDITOR')).toBe(true)
      expect(hasMinimumRole('ADMIN', 'VIEWER')).toBe(true)
    })

    it('EDITOR has minimum role of EDITOR and VIEWER', () => {
      expect(hasMinimumRole('EDITOR', 'OWNER')).toBe(false)
      expect(hasMinimumRole('EDITOR', 'ADMIN')).toBe(false)
      expect(hasMinimumRole('EDITOR', 'EDITOR')).toBe(true)
      expect(hasMinimumRole('EDITOR', 'VIEWER')).toBe(true)
    })

    it('VIEWER has minimum role of VIEWER only', () => {
      expect(hasMinimumRole('VIEWER', 'OWNER')).toBe(false)
      expect(hasMinimumRole('VIEWER', 'ADMIN')).toBe(false)
      expect(hasMinimumRole('VIEWER', 'EDITOR')).toBe(false)
      expect(hasMinimumRole('VIEWER', 'VIEWER')).toBe(true)
    })
  })

  describe('canAccessResource', () => {
    it('OWNER can access any resource', () => {
      expect(canAccessResource('OWNER', 'other-user', 'current-user', 'posts', 'delete')).toBe(true)
    })

    it('ADMIN can access any resource', () => {
      expect(canAccessResource('ADMIN', 'other-user', 'current-user', 'posts', 'delete')).toBe(true)
    })

    it('user can access own resources', () => {
      expect(canAccessResource('EDITOR', 'current-user', 'current-user', 'posts', 'delete')).toBe(true)
    })

    it('EDITOR cannot delete others resources', () => {
      expect(canAccessResource('EDITOR', 'other-user', 'current-user', 'posts', 'delete')).toBe(false)
    })

    it('VIEWER can read others resources', () => {
      expect(canAccessResource('VIEWER', 'other-user', 'current-user', 'posts', 'read')).toBe(true)
    })

    it('VIEWER cannot write to others resources', () => {
      expect(canAccessResource('VIEWER', 'other-user', 'current-user', 'posts', 'create')).toBe(false)
    })
  })

  describe('getRoleDisplayName', () => {
    it('should return correct display names', () => {
      expect(getRoleDisplayName('OWNER')).toBe('Owner')
      expect(getRoleDisplayName('ADMIN')).toBe('Administrator')
      expect(getRoleDisplayName('EDITOR')).toBe('Editor')
      expect(getRoleDisplayName('VIEWER')).toBe('Viewer')
    })
  })

  describe('getRoleColor', () => {
    it('should return correct colors', () => {
      expect(getRoleColor('OWNER')).toBe('#8B5CF6')
      expect(getRoleColor('ADMIN')).toBe('#3B82F6')
      expect(getRoleColor('EDITOR')).toBe('#10B981')
      expect(getRoleColor('VIEWER')).toBe('#6B7280')
    })
  })

  describe('isValidRoleTransition', () => {
    it('OWNER can assign any role except OWNER', () => {
      expect(isValidRoleTransition('OWNER', 'ADMIN')).toBe(true)
      expect(isValidRoleTransition('OWNER', 'EDITOR')).toBe(true)
      expect(isValidRoleTransition('OWNER', 'VIEWER')).toBe(true)
      expect(isValidRoleTransition('OWNER', 'OWNER')).toBe(false)
    })

    it('ADMIN can assign lower roles', () => {
      expect(isValidRoleTransition('ADMIN', 'EDITOR')).toBe(true)
      expect(isValidRoleTransition('ADMIN', 'VIEWER')).toBe(true)
      expect(isValidRoleTransition('ADMIN', 'ADMIN')).toBe(false)
      expect(isValidRoleTransition('ADMIN', 'OWNER')).toBe(false)
    })

    it('EDITOR cannot assign roles', () => {
      expect(isValidRoleTransition('EDITOR', 'VIEWER')).toBe(false)
    })

    it('VIEWER cannot assign roles', () => {
      expect(isValidRoleTransition('VIEWER', 'VIEWER')).toBe(false)
    })
  })

  describe('getAvailableRoles', () => {
    it('OWNER can assign ADMIN, EDITOR, VIEWER', () => {
      const roles = getAvailableRoles('OWNER')
      expect(roles).toEqual(['ADMIN', 'EDITOR', 'VIEWER'])
    })

    it('ADMIN can assign EDITOR, VIEWER', () => {
      const roles = getAvailableRoles('ADMIN')
      expect(roles).toEqual(['EDITOR', 'VIEWER'])
    })

    it('EDITOR cannot assign any roles', () => {
      const roles = getAvailableRoles('EDITOR')
      expect(roles).toEqual([])
    })

    it('VIEWER cannot assign any roles', () => {
      const roles = getAvailableRoles('VIEWER')
      expect(roles).toEqual([])
    })
  })

  describe('filterByPermission', () => {
    const items = [
      { resource: 'posts', action: 'create' },
      { resource: 'posts', action: 'read' },
      { resource: 'billing', action: 'manage' },
      { resource: 'analytics', action: 'export' },
    ]

    it('should filter items by OWNER permissions', () => {
      const filtered = filterByPermission(items, 'OWNER')
      expect(filtered).toHaveLength(4)
    })

    it('should filter items by EDITOR permissions', () => {
      const filtered = filterByPermission(items, 'EDITOR')
      expect(filtered.some((i) => i.resource === 'billing')).toBe(false)
    })

    it('should filter items by VIEWER permissions', () => {
      const filtered = filterByPermission(items, 'VIEWER')
      expect(filtered).toHaveLength(1)
      expect(filtered[0]).toEqual({ resource: 'posts', action: 'read' })
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy values', () => {
      expect(ROLE_HIERARCHY.OWNER).toBe(4)
      expect(ROLE_HIERARCHY.ADMIN).toBe(3)
      expect(ROLE_HIERARCHY.EDITOR).toBe(2)
      expect(ROLE_HIERARCHY.VIEWER).toBe(1)
    })
  })

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions for all roles', () => {
      expect(ROLE_PERMISSIONS.OWNER).toBeDefined()
      expect(ROLE_PERMISSIONS.ADMIN).toBeDefined()
      expect(ROLE_PERMISSIONS.EDITOR).toBeDefined()
      expect(ROLE_PERMISSIONS.VIEWER).toBeDefined()
    })

    it('OWNER should have more permissions than ADMIN', () => {
      expect(ROLE_PERMISSIONS.OWNER.length).toBeGreaterThan(ROLE_PERMISSIONS.ADMIN.length)
    })

    it('ADMIN should have more permissions than EDITOR', () => {
      expect(ROLE_PERMISSIONS.ADMIN.length).toBeGreaterThan(ROLE_PERMISSIONS.EDITOR.length)
    })

    it('EDITOR should have more permissions than VIEWER', () => {
      expect(ROLE_PERMISSIONS.EDITOR.length).toBeGreaterThan(ROLE_PERMISSIONS.VIEWER.length)
    })

    it('each permission should have resource and action', () => {
      Object.values(ROLE_PERMISSIONS).forEach((permissions) => {
        permissions.forEach((p) => {
          expect(p.resource).toBeTruthy()
          expect(p.action).toBeTruthy()
        })
      })
    })
  })
})
