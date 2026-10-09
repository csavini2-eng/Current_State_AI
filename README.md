# GoodBoy

**GoodBoy is a training journey tool that helps trainers and dog handlers follow the same plan for a service dog in training.**

## What this slice lets a user do

- Add a new dog (name, breed, type, handler). Saving with no name is blocked with a message.
- Assign a training path (for example "Foundation Skills") to that dog.
- Open the dog's journey and set each milestone to Not started, In progress, or Completed. A counter shows how many are completed.
- Use "Share With Handler" to give the handler a read-only view of the dog's journey.

## Open the prototype

Live app: https://good-boy-dog-training-platform.replit.app

Open the link and use **Add New Dog**. No sign-in is needed to try it, and records are saved only in your browser. Signing in is needed for saved video uploads and handler links.

## AI (simulated for now)

The AI is **simulated for now**. It is not connected to a real model yet.

The planned behavior: the handler (the dog owner, not the trainer) uploads a training video. The AI tells them what they are doing right and what to improve. It also gives suggestions, such as flagging when a milestone is taking longer than usual.

## Test results

These three tests were run on the live app.

| Test | Input | Expected | Result |
| --- | --- | --- | --- |
| Typical | Add dog "Biscuit" (Labrador, Service dog in training, handler Maria), assign the Foundation Skills path, set Sit to Completed | Dog saved, journey shows 5 milestones, counter updates | Pass. The profile saved, 5 milestones showed, and the completed counter updated. |
| Challenge | Mark Retrieve as Completed while Stay is still Not started | App handles an out-of-order milestone sensibly | Partial. It allowed the change and updated the counter, with no warning about the order. |
| Invalid / empty | Save a new dog with an empty name | Dog is not saved and the user sees an error | Pass. "Add the dog's name." appeared and nothing was saved. |

## Known limitations

1. Data is saved only in the current browser unless the user signs in. Video upload and handler links also need sign-in.
2. The AI feedback is simulated. Nothing analyzes videos yet.
3. No guidance on milestone order, and some fields show placeholders (for example "Cue not added yet"). The Foundation Skills path and the dog Raya are sample data.
