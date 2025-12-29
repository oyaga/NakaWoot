export type UserAvailability = 'online' | 'offline' | 'busy';

export interface User {
id: number;
email: string;
name: string;
display_name?: string;
availability: UserAvailability;
avatar_url?: string;
ui_settings: Record<string, any>;
}

export interface Account {
id: number;
name: string;
status: 'active' | 'suspended';
locale: string;
}

export interface AccountUser {
account_id: number;
user_id: number;
role: 'agent' | 'administrator';
availability: UserAvailability;
}

export interface AuthSession {
user: User;
accounts: Account[];
currentAccount: Account | null;
token: string;
}