import { Group, Button, Menu, Anchor, Avatar, Text } from '@mantine/core';
import { IconChevronDown, IconSettings, IconLogout } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

type NavbarProps = {
  username: string;
  onLogout: () => void;
  onOpenSettings?: () => void;
};

const Navbar: React.FC<NavbarProps> = ({ username, onLogout, onOpenSettings }) => (
  <Group h="100%" px="md" justify="space-between">
    <Anchor component={Link} to="/assessments" underline="never">
      <Text fw={800} size="xl" c="blue">GradeFlow</Text>
    </Anchor>
    <Menu position="bottom-end" withArrow>
      <Menu.Target>
        <Button
          variant="subtle"
          leftSection={
            <Avatar size="sm" radius="xl" color="blue">
              {username.charAt(0).toUpperCase()}
            </Avatar>
          }
          rightSection={<IconChevronDown size={14} />}
          px="xs"
        >
          {username}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        {onOpenSettings && (
          <Menu.Item leftSection={<IconSettings size={16} />} onClick={onOpenSettings}>
            Settings
          </Menu.Item>
        )}
        <Menu.Item leftSection={<IconLogout size={16} />} color="red" onClick={onLogout}>
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  </Group>
);

export default Navbar;