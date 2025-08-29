import * as React from "react"
import { Button } from "@rafal.lemieszewski/tide-ui"
import { cn } from "../../lib/utils"

// SidebarMenuAction component from shadcn UI
const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & {
    showOnHover?: boolean
  }
>(({ className, showOnHover = false, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      data-sidebar="menu-action"
      variant="ghost"
      size="sm"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Peer is SidebarMenuButton
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=md]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

export { SidebarMenuAction }