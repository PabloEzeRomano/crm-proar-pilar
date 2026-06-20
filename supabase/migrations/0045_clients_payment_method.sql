-- 0045_clients_payment_method.sql
--
-- Track the client's last payment method used. Starts empty for new clients
-- and is filled on first contact. Free text for now; will reference the
-- payment-methods catalog once that lands.

ALTER TABLE public.clients
  ADD COLUMN last_payment_method TEXT;
