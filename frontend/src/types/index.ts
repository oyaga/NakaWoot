export enum UserRole {
AGENT = 0,
ADMINISTRATOR = 1,
}

export interface Account {
id: number;
name: string;
locale: string;
domain?: string;
settings: Record<string, unknown>;
}

export interface AccountUser {
id: number;
account_id: number;
user_id: number;
role: UserRole;
account?: Account;
}

export interface User {
id: number;
email: string;
name: string;
display_name?: string;
avatar_url?: string;
account_users?: AccountUser[]; // Lista vinda do relacionamento Go
}

export interface AuthState {
user: User | null;
currentAccount: Account | null;
token: string | null;
setAuth: (user: User, token: string) => void;
setCurrentAccount: (account: Account) => void;
logout: () => void;
}