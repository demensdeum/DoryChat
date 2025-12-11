// Centralized model registry to ensure all models are registered before use
// Import order matters: define models with no dependencies first

import Room from './Room';
import Message from './Message';
import User from './User';

// Export all models from a single location
export { Room, Message, User };

// This ensures all models are registered when this file is imported
export default {
    Room,
    Message,
    User
};
