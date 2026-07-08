-- AddForeignKey
ALTER TABLE `user_api_keys` ADD CONSTRAINT `user_api_keys_model_id_fkey` FOREIGN KEY (`model_id`) REFERENCES `ai_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
