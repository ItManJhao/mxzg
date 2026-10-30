/** Compile-only contracts. This function is never executed and sends no test events. */
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { BagEvent } from "../assets/scripts/features/Bag/BagEvent";
import type { BagUpdateData } from "../assets/scripts/features/Bag/data/BagEventData";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import type { ViewController } from "../assets/scripts/framework/ui/UIRegistry";

function checkEventAndLifecycleTypes(data: BagUpdateData): void {
    const events = EventDispatcher.instance;
    events.emit(BagEvent.BagUpdate, data);
    events.on(BagEvent.BagUpdate, value => { const revision: number = value.revision; return revision; });
    events.once(BagEvent.BagUpdate, value => { const role: string | null = value.roleKey; return role; });
    // @ts-expect-error Event names must be declared by a module.
    events.emit("bag.typo", data);
    // @ts-expect-error Wrong event payload cannot compile.
    events.emit(BagEvent.BagUpdate, { revision: "wrong" });
    // @ts-expect-error Change payloads are immutable.
    data.added.push({itemId: 1, quantity: 1});
    // @ts-expect-error Snapshot item quantities are immutable.
    if (data.removed[0]) data.removed[0].quantity = 2;
    // @ts-expect-error A module Controller is not a window's show/close adapter.
    const pageController: ViewController = BagController.instance;
    void pageController;
}
void checkEventAndLifecycleTypes;
