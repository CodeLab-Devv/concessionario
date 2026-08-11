/*
  # Create sales table

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to users)
      - `employee_name` (text)
      - `item_name` (text)
      - `car_model` (text, nullable)
      - `price` (numeric)
      - `quantity` (integer)
      - `total` (numeric)
      - `date` (date)
      - `type` (enum: sale)
      - `category` (enum: concessionari)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `sales` table
    - Add policies for users to manage their own sales
    - Add policy for directors to see all sales
*/

-- Create enum types
CREATE TYPE sale_type AS ENUM ('sale');
CREATE TYPE sale_category AS ENUM ('concessionari');

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  item_name text NOT NULL,
  car_model text,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  type sale_type NOT NULL DEFAULT 'sale',
  category sale_category NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own sales"
  ON sales
  FOR ALL
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Directors can see all sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'director'
    )
  );

-- Insert demo sales
INSERT INTO sales (employee_id, employee_name, item_name, car_model, price, quantity, total, category) 
SELECT 
  u.id,
  u.name,
  'Macchina bit',
  'BMW X5',
  70000,
  1,
  70000,
  'concessionari'
FROM users u WHERE u.email = 'concessionario@azienda.com';
