from pathlib import Path

path = Path('src/components/modals/ProfileModal.tsx')
text = path.read_text()

old = """      const changedEmail = email !== user.email.toLowerCase();
      let emailChangeRequested = false;

      if (changedEmail) {
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          throw new Error('Inserisci un indirizzo email valido.');
        }

        const { error: emailError } = await supabase.auth.updateUser({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (emailError) {
          throw new Error(`Impossibile cambiare email: ${emailError.message}`);
        }

        emailChangeRequested = true;
      }
"""

new = """      const changedEmail = email !== user.email.toLowerCase();
      let emailChanged = false;

      if (changedEmail) {
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
          throw new Error('Inserisci un indirizzo email valido.');
        }

        const { data, error: emailError } = await supabase.functions.invoke('update-own-email', {
          body: { email },
        });

        if (emailError) {
          throw new Error(`Impossibile cambiare email: ${emailError.message}`);
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Impossibile cambiare email.');
        }

        emailChanged = true;
      }
"""

if old not in text:
    raise SystemExit('Expected email flow was not found; aborting without changes.')

text = text.replace(old, new, 1)
text = text.replace('if (!changedProfile && !emailChangeRequested && !changedPassword) {', 'if (!changedProfile && !emailChanged && !changedPassword) {', 1)
text = text.replace('        email: emailChangeRequested ? user.email : email,', '        email: emailChanged ? email : email || user.email,', 1)

old_success = """      if (emailChangeRequested) {
        showSuccess(
          'Conferma richiesta',
          `Abbiamo inviato una email di conferma a ${email}. L'indirizzo verrà cambiato dopo la conferma.`,
        );
      } else {
        showSuccess('Profilo aggiornato', 'Le modifiche sono state salvate correttamente.');
      }
"""

if old_success not in text:
    raise SystemExit('Expected email confirmation message was not found; aborting without changes.')

text = text.replace(old_success, "      showSuccess('Profilo aggiornato', 'Le modifiche sono state salvate correttamente.');\n", 1)
path.write_text(text)
